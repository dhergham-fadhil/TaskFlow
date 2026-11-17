using TaskFlow.Models;
using TaskFlow.Dtos;
using TaskFlow.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Microsoft.Data.SqlClient;

namespace TaskFlow.Services;

public class TaskService : ITaskService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuthorizationService _authorization;

    public TaskService(ApplicationDbContext context, IAuthorizationService authorization)
    {
        _context = context;
        _authorization = authorization;
    }

    public async Task<PagedResult<TaskResponseDto>> ListAsync(int userId, int? projectId, string? status, int page, int pageSize)
    {
        PaginationValidation.Validate(page, pageSize);

        var accessibleProjectIds = await AccessibleProjectIdsAsync(userId);

        var query = _context.Tasks
            .Include(t => t.Subtasks)
            .Include(t => t.Comments)
            .AsNoTracking()
            .Where(t => accessibleProjectIds.Contains(t.ProjectId));

        if (projectId.HasValue) query = query.Where(t => t.ProjectId == projectId.Value);
        if (status is not null) query = query.Where(t => t.Status == status);

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(t => t.Status)
            .ThenBy(t => t.Order)
            .ThenBy(t => t.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => t.ToDto())
            .ToListAsync();

        return new PagedResult<TaskResponseDto>(items, page, pageSize, total);
    }

    public async Task<TaskResponseDto?> GetAsync(int id, int userId)
    {
        var task = await _context.Tasks
            .Include(t => t.Subtasks)
            .Include(t => t.Comments)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);
        if (task is null) return null;

        if (!await _authorization.CanAccessTaskAsync(task.Id, userId))
            throw new ForbiddenException("You do not have access to this task.");

        return task.ToDto();
    }

    public async Task<TaskResponseDto> CreateAsync(CreateTaskDto dto, int actorId)
    {
        if (!AppEnums.TaskStatuses.Contains(dto.Status, StringComparer.Ordinal))
            throw new ValidationException($"Invalid status '{dto.Status}'. Allowed: {string.Join(", ", AppEnums.TaskStatuses)}");
        if (!AppEnums.TaskPriorities.Contains(dto.Priority, StringComparer.Ordinal))
            throw new ValidationException($"Invalid priority '{dto.Priority}'. Allowed: {string.Join(", ", AppEnums.TaskPriorities)}");

        var project = await _context.Projects
            .Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.Id == dto.ProjectId)
            ?? throw new ValidationException("Project not found.");
        if (!await _authorization.CanAccessProjectAsync(project.Id, actorId))
            throw new ForbiddenException("You do not have access to this project.");

        if (dto.AssigneeId.HasValue)
            await EnsureAssigneeAllowedAsync(project.Id, dto.AssigneeId.Value);

        // Compute a gap-based order with retry on concurrent inserts.
        // Two concurrent creates can both read the same Max(Order) and collide
        // on the unique index (ProjectId, Status, Order); retry up to 5 times.
        decimal order;
        var maxRetries = 5;
        for (var attempt = 0; attempt < maxRetries; attempt++)
        {
            var lastOrder = await _context.Tasks
                .Where(t => t.ProjectId == dto.ProjectId && t.Status == dto.Status)
                .MaxAsync(t => (decimal?)t.Order);
            order = lastOrder.HasValue ? (lastOrder.Value + 1000m) : 0m;

            var task = new ProjectTask
            {
                Title = dto.Title,
                Description = dto.Description,
                ProjectId = dto.ProjectId,
                Status = dto.Status,
                Priority = dto.Priority,
                AssigneeId = dto.AssigneeId,
                Labels = dto.Labels,
                DueDate = dto.DueDate,
                Order = order,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            foreach (var sub in dto.Subtasks.Where(s => !string.IsNullOrWhiteSpace(s.Title)))
                task.Subtasks.Add(new SubTask { Title = sub.Title, Done = sub.Done });

            _context.Tasks.Add(task);

            // Task creation + activity log are atomic: a single SaveChanges.
            _context.Activities.Add(new Activity
            {
                ActorId = actorId,
                Action = "created",
                Target = task.Title,
                Kind = "create",
                ProjectId = task.ProjectId,
                TaskId = task.Id
            });

            try
            {
                await _context.SaveChangesAsync();
                return await LoadDtoAsync(task.Id);
            }
            catch (SqlException ex) when ((ex.Number == 2601 || ex.Number == 2627) && attempt < maxRetries - 1)
            {
                // Unique index collision — detach all tracked entities from the
                // failed attempt and retry with a fresh order.
                var staleEntries = _context.ChangeTracker.Entries()
                    .Where(e => e.State == EntityState.Added &&
                        (e.Entity is ProjectTask || e.Entity is Activity || e.Entity is SubTask))
                    .ToList();
                foreach (var entry in staleEntries)
                    entry.State = EntityState.Detached;
                continue;
            }
        }

        throw new ValidationException("Unable to create task due to a concurrent ordering conflict. Please retry.");
    }

    public async Task<TaskResponseDto?> UpdateAsync(int id, UpdateTaskDto patch, int actorId)
    {
        var task = await _context.Tasks
            .Include(t => t.Subtasks)
            .Include(t => t.Comments)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (task is null) return null;

        if (!await _authorization.CanAccessTaskAsync(id, actorId)) return null;

        if (!string.IsNullOrWhiteSpace(patch.Title))
            task.Title = patch.Title.Trim();

        if (patch.Description is not null)
            task.Description = patch.Description;

        if (!string.IsNullOrWhiteSpace(patch.Status))
        {
            if (!AppEnums.TaskStatuses.Contains(patch.Status, StringComparer.Ordinal))
                throw new ValidationException($"Invalid status '{patch.Status}'. Allowed: {string.Join(", ", AppEnums.TaskStatuses)}");
            task.Status = patch.Status;
        }

        if (!string.IsNullOrWhiteSpace(patch.Priority))
        {
            if (!AppEnums.TaskPriorities.Contains(patch.Priority, StringComparer.Ordinal))
                throw new ValidationException($"Invalid priority '{patch.Priority}'. Allowed: {string.Join(", ", AppEnums.TaskPriorities)}");
            task.Priority = patch.Priority;
        }

        if (patch.AssigneeId.HasValue)
        {
            if (patch.AssigneeId.Value.ValueKind == JsonValueKind.Null)
                task.AssigneeId = null;
            else
            {
                var assigneeId = patch.AssigneeId.Value.GetInt32();
                await EnsureAssigneeAllowedAsync(task.ProjectId, assigneeId);
                task.AssigneeId = assigneeId;
            }
        }

        if (patch.DueDate.HasValue)
        {
            if (patch.DueDate.Value.ValueKind == JsonValueKind.Null)
                task.DueDate = null;
            else
                task.DueDate = patch.DueDate.Value.GetDateTime();
        }

        if (patch.Labels is not null)
            task.Labels = patch.Labels;

        if (patch.Subtasks is not null)
            ReconcileSubtasksTyped(task, patch.Subtasks);

        task.UpdatedAt = DateTime.UtcNow;

        _context.Activities.Add(new Activity
        {
            ActorId = actorId,
            Action = "updated",
            Target = task.Title,
            Kind = "update",
            ProjectId = task.ProjectId,
            TaskId = task.Id
        });

        await _context.SaveChangesAsync();

        return await LoadDtoAsync(task.Id);
    }

    public async Task<bool> DeleteAsync(int id, int actorId)
    {
        var task = await _context.Tasks.FindAsync(id);
        if (task is null) return false;

        if (!await _authorization.CanAccessTaskAsync(id, actorId)) return false;

        _context.Tasks.Remove(task);

        // Task deletion + activity log are atomic.
        _context.Activities.Add(new Activity
        {
            ActorId = actorId,
            Action = "deleted",
            Target = task.Title,
            Kind = "update",
            ProjectId = task.ProjectId
        });

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<List<TaskResponseDto>?> MoveAsync(int id, MoveTaskDto dto, int actorId)
    {
        if (!AppEnums.TaskStatuses.Contains(dto.Status, StringComparer.Ordinal))
            throw new ValidationException($"Invalid status '{dto.Status}'.");

        var task = await _context.Tasks
            .Include(t => t.Subtasks)
            .Include(t => t.Comments)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (task is null) return null;

        if (!await _authorization.CanAccessTaskAsync(id, actorId)) return null;

        // Concurrent drag-and-drop: retry on RowVersion conflicts.
        var moveRetries = 5;
        for (var attempt = 0; attempt < moveRetries; attempt++)
        {
            // Re-read the task each attempt so RowVersion is current.
            var currentTask = await _context.Tasks
                .Include(t => t.Subtasks)
                .Include(t => t.Comments)
                .FirstOrDefaultAsync(t => t.Id == id);
            if (currentTask is null) return null;

            if (!await _authorization.CanAccessTaskAsync(id, actorId)) return null;

            var column = await _context.Tasks
                .Where(t => t.ProjectId == currentTask.ProjectId && t.Status == dto.Status && t.Id != id)
                .OrderBy(t => t.Order)
                .ThenBy(t => t.Id)
                .ToListAsync();

            var index = Math.Clamp(dto.Index, 0, column.Count);

            // Gap-based ordering: compute a fractional order between neighbours.
            decimal newOrder;
            if (column.Count == 0)
            {
                newOrder = 0m;
            }
            else if (index == 0)
            {
                var first = column[0];
                newOrder = first.Order > 0 ? first.Order / 2m : 0m;
            }
            else if (index == column.Count)
            {
                var last = column[^1];
                newOrder = last.Order + 1000m;
            }
            else
            {
                var prev = column[index - 1];
                var next = column[index];
                var gap = next.Order - prev.Order;
                if (gap < 1m)
                {
                    // Gaps are exhausted — rebalance the whole column to restore headroom.
                    for (var i = 0; i < column.Count; i++)
                        column[i].Order = i * 1000m;
                    newOrder = index * 1000m;
                    // Shift tasks at/after the insertion point down by one slot.
                    for (var i = column.Count - 1; i >= index; i--)
                        column[i].Order = (i + 1) * 1000m;
                }
                else
                {
                    newOrder = (prev.Order + next.Order) / 2m;
                }
            }

            currentTask.Order = newOrder;
            currentTask.Status = dto.Status;
            currentTask.UpdatedAt = DateTime.UtcNow;

            // Remove any previously tracked activity for this attempt and add fresh one.
            var existingActivity = _context.ChangeTracker.Entries<Activity>()
                .FirstOrDefault(a => a.Entity.TaskId == id && a.Entity.Kind == "move" && a.State == EntityState.Added);
            if (existingActivity is not null)
                existingActivity.State = EntityState.Detached;

            _context.Activities.Add(new Activity
            {
                ActorId = actorId,
                Action = "moved",
                Target = currentTask.Title,
                Kind = "move",
                ProjectId = currentTask.ProjectId,
                TaskId = currentTask.Id
            });

            try
            {
                // Single SaveChanges: task state + activity log. EF Core wraps the
                // save in a transaction, so either both commit or neither does.
                await _context.SaveChangesAsync();

                // Return the full column in its new order.
                var updatedColumn = await _context.Tasks
                    .Include(t => t.Subtasks)
                    .Include(t => t.Comments)
                    .Where(t => t.ProjectId == currentTask.ProjectId && t.Status == dto.Status)
                    .OrderBy(t => t.Order)
                    .ThenBy(t => t.Id)
                    .Select(t => t.ToDto())
                    .ToListAsync();

                return updatedColumn;
            }
            catch (DbUpdateConcurrencyException) when (attempt < moveRetries - 1)
            {
                // RowVersion conflict — another request moved this task first.
                // Detach stale activity and retry with fresh task state.
                var staleActivities = _context.ChangeTracker.Entries<Activity>()
                    .Where(a => a.Entity.TaskId == id && a.Entity.Kind == "move" && a.State == EntityState.Added)
                    .ToList();
                foreach (var entry in staleActivities)
                    entry.State = EntityState.Detached;
                continue;
            }
            catch (SqlException ex) when ((ex.Number == 2601 || ex.Number == 2627) && attempt < moveRetries - 1)
            {
                // Unique index collision during rebalance — retry with fresh state.
                var staleActivities = _context.ChangeTracker.Entries<Activity>()
                    .Where(a => a.Entity.TaskId == id && a.Entity.Kind == "move" && a.State == EntityState.Added)
                    .ToList();
                foreach (var entry in staleActivities)
                    entry.State = EntityState.Detached;
                continue;
            }
        }

        throw new ValidationException("This task was moved by another request. Refresh and try again.");
    }

    public async Task<TaskResponseDto?> ToggleSubtaskAsync(int taskId, int subtaskId, int actorId)
    {
        if (!await _authorization.CanAccessTaskAsync(taskId, actorId)) return null;

        var subtask = await _context.SubTasks
            .FirstOrDefaultAsync(s => s.Id == subtaskId && s.TaskId == taskId);
        if (subtask is null) return null;

        subtask.Done = !subtask.Done;
        await _context.SaveChangesAsync();
        return await LoadDtoAsync(taskId);
    }

    public async Task<CommentResponseDto?> AddCommentAsync(int taskId, string body, int actorId)
    {
        if (string.IsNullOrWhiteSpace(body))
            throw new ValidationException("Comment body cannot be empty.");

        var task = await _context.Tasks.FindAsync(taskId);
        if (task is null) return null;

        if (!await _authorization.CanAccessTaskAsync(taskId, actorId)) return null;

        var comment = new Comment
        {
            Body = body.Trim(),
            AuthorId = actorId,
            CreatedAt = DateTime.UtcNow,
            TaskId = taskId
        };

        _context.Comments.Add(comment);

        // Comment creation + activity log are atomic: a single SaveChanges.
        _context.Activities.Add(new Activity
        {
            ActorId = actorId,
            Action = "commented on",
            Target = task.Title,
            Kind = "comment",
            ProjectId = task.ProjectId,
            TaskId = taskId
        });

        await _context.SaveChangesAsync();

        return new CommentResponseDto
        {
            Id = comment.Id,
            Body = comment.Body,
            AuthorId = comment.AuthorId,
            CreatedAt = comment.CreatedAt
        };
    }

    /// <summary>
    /// An assignee must be a real account that can see the project
    /// (owner, member, or administrator). This prevents leaking other users'
    /// identities through task assignment.
    /// </summary>
    private async Task EnsureAssigneeAllowedAsync(int projectId, int assigneeId)
    {
        var project = await _context.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == projectId);
        if (project is null) throw new ValidationException("Project not found.");

        var assignee = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == assigneeId);
        if (assignee is null) throw new ValidationException("Assignee not found.");

        if (!await _authorization.CanAccessProjectAsync(projectId, assigneeId))
            throw new ValidationException("Assignee does not have access to this project.");
    }

    private static void ReconcileSubtasksTyped(ProjectTask task, List<UpdateSubtaskDto> incoming)
    {
        foreach (var existing in task.Subtasks.ToList())
        {
            var match = incoming.FirstOrDefault(i => i.Id.HasValue && i.Id.Value == existing.Id);
            if (match is null)
            {
                task.Subtasks.Remove(existing);
                continue;
            }
            existing.Title = match.Title;
            existing.Done = match.Done;
        }

        foreach (var item in incoming.Where(i => !i.Id.HasValue && !string.IsNullOrWhiteSpace(i.Title)))
            task.Subtasks.Add(new SubTask { Title = item.Title, Done = item.Done });
    }

    private async Task<TaskResponseDto> LoadDtoAsync(int id) =>
        (await _context.Tasks
            .Include(t => t.Subtasks)
            .Include(t => t.Comments)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id))!.ToDto();

    private async Task<List<int>> AccessibleProjectIdsAsync(int userId) =>
        await _context.Projects
            .AsNoTracking()
            .Where(p => p.OwnerId == userId || p.Members.Any(m => m.UserId == userId))
            .Select(p => p.Id)
            .ToListAsync();
}


