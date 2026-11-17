using TaskFlow.Models;
using TaskFlow.Dtos;
using TaskFlow.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace TaskFlow.Services;

public class ProjectService : IProjectService
{
    private readonly ApplicationDbContext _context;

    public ProjectService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<ProjectResponseDto>> ListAsync(int userId, int page, int pageSize)
    {
        PaginationValidation.Validate(page, pageSize);

        var query = _context.Projects
            .Include(p => p.Members)
            .Include(p => p.Tasks)
                .ThenInclude(t => t.Subtasks)
            .Include(p => p.Tasks)
                .ThenInclude(t => t.Comments)
            .AsNoTracking()
            .Where(p => p.OwnerId == userId || p.Members.Any(m => m.UserId == userId));

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(p => p.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => p.ToDto())
            .ToListAsync();

        return new PagedResult<ProjectResponseDto>(items, page, pageSize, total);
    }

    public async Task<ProjectResponseDto?> GetAsync(int id, int userId)
    {
        var project = await _context.Projects
            .Include(p => p.Members)
            .Include(p => p.Tasks)
                .ThenInclude(t => t.Subtasks)
            .Include(p => p.Tasks)
                .ThenInclude(t => t.Comments)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project is null) return null;

        var actor = await _context.Users.FindAsync(userId);
        return AccessControl.CanAccessProject(actor, project) ? project.ToDto() : null;
    }

    public async Task<ProjectResponseDto> CreateAsync(CreateProjectDto dto, int ownerId)
    {
        if (!AppEnums.ProjectStatuses.Contains(dto.Status, StringComparer.Ordinal))
            throw new ValidationException($"Invalid status '{dto.Status}'. Allowed: {string.Join(", ", AppConstants.ProjectStatuses)}");
        if (!AppConstants.ProjectIcons.Contains(dto.Icon, StringComparer.Ordinal))
            throw new ValidationException($"Invalid icon '{dto.Icon}'. Allowed: {string.Join(", ", AppConstants.ProjectIcons)}");

        if (dto.MemberIds.Any(id => id != ownerId))
        {
            var knownIds = await _context.Users
                .AsNoTracking()
                .Where(u => dto.MemberIds.Contains(u.Id))
                .Select(u => u.Id)
                .ToListAsync();
            var unknown = dto.MemberIds.Where(id => id != ownerId).Except(knownIds).ToList();
            if (unknown.Count > 0)
                throw new ValidationException($"Unknown member ids: {string.Join(", ", unknown)}.");
        }

        var memberIds = new List<int> { ownerId };
        memberIds.AddRange(dto.MemberIds.Where(id => id != ownerId));
        memberIds = memberIds.Distinct().ToList();

        var project = new Project
        {
            Name = dto.Name,
            Description = dto.Description,
            Color = dto.Color,
            Icon = dto.Icon,
            Status = dto.Status,
            DueDate = dto.DueDate,
            OwnerId = ownerId,
            CreatedAt = DateTime.UtcNow,
            Members = memberIds.Select(id => new ProjectMember { UserId = id, JoinedAt = DateTime.UtcNow }).ToList()
        };

        _context.Projects.Add(project);

        // Project creation + initial activity log are atomic: a single SaveChanges.
        _context.Activities.Add(new Activity
        {
            ActorId = ownerId,
            Action = "created",
            Target = project.Name,
            Kind = "project",
            ProjectId = project.Id
        });

        await _context.SaveChangesAsync();

        return project.ToDto();
    }

    public async Task<ProjectResponseDto?> UpdateAsync(int id, System.Text.Json.JsonElement patch, int userId)
    {
        var project = await _context.Projects
            .Include(p => p.Tasks)
                .ThenInclude(t => t.Subtasks)
            .Include(p => p.Tasks)
                .ThenInclude(t => t.Comments)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project is null) return null;

        var actor = await _context.Users.FindAsync(userId);
        if (!AccessControl.CanManageProject(actor, project)) return null;

        if (patch.TryGetProperty("name", out var name) && name.ValueKind is System.Text.Json.JsonValueKind.String)
        {
            var newName = name.GetString()?.Trim();
            if (string.IsNullOrWhiteSpace(newName))
                throw new ValidationException("Name cannot be empty.");
            project.Name = newName;
        }

        if (patch.TryGetProperty("description", out var description) && description.ValueKind is System.Text.Json.JsonValueKind.String)
            project.Description = description.GetString() ?? project.Description;

        if (patch.TryGetProperty("color", out var color) && color.ValueKind is System.Text.Json.JsonValueKind.String)
            project.Color = color.GetString() ?? project.Color;

        if (patch.TryGetProperty("icon", out var icon) && icon.ValueKind is System.Text.Json.JsonValueKind.String)
        {
            var value = icon.GetString() ?? project.Icon;
            if (!AppConstants.ProjectIcons.Contains(value, StringComparer.Ordinal))
                throw new ValidationException($"Invalid icon '{value}'.");
            project.Icon = value;
        }

        if (patch.TryGetProperty("status", out var status) && status.ValueKind is System.Text.Json.JsonValueKind.String)
        {
            if (!AppConstants.IsValidProjectStatus(status.GetString()))
                throw new ValidationException($"Invalid status '{status.GetString()}'.");
            project.Status = status.GetString()!;
        }

        if (patch.TryGetProperty("dueDate", out var dueDate))
            project.DueDate = dueDate.ValueKind is System.Text.Json.JsonValueKind.Null
                ? null
                : dueDate.Deserialize<DateTime?>();

        if (patch.TryGetProperty("memberIds", out var memberIds) && memberIds.ValueKind is System.Text.Json.JsonValueKind.Array)
        {
            var requestedIds = memberIds.EnumerateArray().Select(x => x.GetInt32()).Distinct().ToList();
            // Every member must reference a real account.
            var knownIds = await _context.Users
                .AsNoTracking()
                .Where(u => requestedIds.Contains(u.Id))
                .Select(u => u.Id)
                .ToListAsync();
            var unknown = requestedIds.Except(knownIds).ToList();
            if (unknown.Count > 0)
                throw new ValidationException($"Unknown member ids: {string.Join(", ", unknown)}.");

            // The owner always keeps membership; removing them would orphan the project.
            if (!requestedIds.Contains(project.OwnerId))
                requestedIds.Add(project.OwnerId);

            // Replace membership: add missing, remove extras.
            var currentMemberIds = project.Members.Select(m => m.UserId).ToHashSet();
            var toAdd = requestedIds.Except(currentMemberIds).ToList();
            var toRemove = project.Members.Where(m => !requestedIds.Contains(m.UserId)).ToList();

            foreach (var memberUserId in toAdd)
                project.Members.Add(new ProjectMember { UserId = memberUserId, JoinedAt = DateTime.UtcNow });
            foreach (var membership in toRemove)
                project.Members.Remove(membership);
        }

        // Project update + activity log are atomic.
        _context.Activities.Add(new Activity
        {
            ActorId = userId,
            Action = "updated",
            Target = project.Name,
            Kind = "project",
            ProjectId = project.Id
        });

        await _context.SaveChangesAsync();

        return project.ToDto();
    }

    public async Task<ProjectResponseDto?> SetStatusAsync(int id, string status, int userId)
    {
        if (!AppConstants.IsValidProjectStatus(status))
            throw new ValidationException($"Invalid status '{status}'. Allowed: {string.Join(", ", AppConstants.ProjectStatuses)}");

        var project = await _context.Projects.FindAsync(id);
        if (project is null) return null;

        var actor = await _context.Users.FindAsync(userId);
        if (!AccessControl.CanManageProject(actor, project)) return null;

        project.Status = status;

        // Status change + activity log are atomic.
        _context.Activities.Add(new Activity
        {
            ActorId = userId,
            Action = status == "paused" ? "paused" : "updated",
            Target = project.Name,
            Kind = "project",
            ProjectId = project.Id
        });

        await _context.SaveChangesAsync();

        return project.ToDto();
    }

    public async Task<bool> DeleteAsync(int id, int userId)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project is null) return false;

        var actor = await _context.Users.FindAsync(userId);
        if (!AccessControl.CanManageProject(actor, project)) return false;

        _context.Projects.Remove(project);

        // Project deletion + activity log are atomic.
        _context.Activities.Add(new Activity
        {
            ActorId = userId,
            Action = "deleted",
            Target = project.Name,
            Kind = "project",
            ProjectId = project.Id
        });

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> AddMemberAsync(int projectId, int memberId, int userId)
    {
        var project = await _context.Projects
            .Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.Id == projectId);
        if (project is null) return false;

        var actor = await _context.Users.FindAsync(userId);
        if (!AccessControl.CanManageProject(actor, project)) return false;

        var member = await _context.Users.FindAsync(memberId);
        if (member is null) return false;

        if (!project.Members.Any(m => m.UserId == memberId))
        {
            project.Members.Add(new ProjectMember { UserId = memberId, JoinedAt = DateTime.UtcNow });

            // Member addition + activity log are atomic.
            _context.Activities.Add(new Activity
            {
                ActorId = userId,
                Action = "updated members of",
                Target = project.Name,
                Kind = "project",
                ProjectId = project.Id
            });

            await _context.SaveChangesAsync();
        }

        return true;
    }

    public async Task<bool> RemoveMemberAsync(int projectId, int memberId, int userId)
    {
        var project = await _context.Projects
            .Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.Id == projectId);
        if (project is null) return false;

        var actor = await _context.Users.FindAsync(userId);
        if (!AccessControl.CanManageProject(actor, project)) return false;

        // The owner cannot be removed from their own project.
        if (memberId == project.OwnerId) return false;

        var membership = project.Members.FirstOrDefault(m => m.UserId == memberId);
        if (membership is not null)
        {
            project.Members.Remove(membership);

            // Member removal + activity log are atomic.
            _context.Activities.Add(new Activity
            {
                ActorId = userId,
                Action = "updated members of",
                Target = project.Name,
                Kind = "project",
                ProjectId = project.Id
            });

            await _context.SaveChangesAsync();
        }

        return true;
    }
}

