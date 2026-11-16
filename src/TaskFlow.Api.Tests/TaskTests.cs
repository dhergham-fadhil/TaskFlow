using TaskFlow.Data;
using TaskFlow.Dtos;
using TaskFlow.Models;
using TaskFlow.Services;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Api.Tests;

public class TaskServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;

    public TaskServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"tasks_{Guid.NewGuid():N}")
            .Options;
        _context = new ApplicationDbContext(options);
        SeedDatabase().Wait();
    }

    private async Task SeedDatabase()
    {
        var user = new User
        {
            Email = "user@example.com",
            PasswordHash = "hash",
            Name = "Test User",
            Role = "member"
        };
        _context.Users.Add(user);

        var project = new Project
        {
            Name = "Test Project",
            Description = "Desc",
            Color = "#6D5EF8",
            Icon = "rocket",
            Status = "active",
            MemberIds = new List<int> { user.Id },
            OwnerId = user.Id,
            CreatedAt = DateTime.UtcNow
        };
        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        _context.Tasks.AddRange(
            new ProjectTask
            {
                Title = "Task 1",
                Description = "First task",
                ProjectId = project.Id,
                Status = "backlog",
                Priority = "medium",
                AssigneeId = user.Id,
                Order = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new ProjectTask
            {
                Title = "Task 2",
                Description = "Second task",
                ProjectId = project.Id,
                Status = "in_progress",
                Priority = "high",
                AssigneeId = user.Id,
                Order = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        );
        await _context.SaveChangesAsync();
    }

    private TaskService CreateService() => new(_context);

    private int GetUserId() => _context.Users.First().Id;
    private int GetProjectId() => _context.Projects.First().Id;

    public void Dispose() => _context.Dispose();

    [Fact]
    public async Task Create_Task_AssignsOrderAfterExisting()
    {
        var service = CreateService();
        var userId = GetUserId();
        var projectId = GetProjectId();

        var result = await service.CreateAsync(new CreateTaskDto
        {
            Title = "New Task",
            ProjectId = projectId,
            Status = "backlog",
            Priority = "medium"
        }, userId);

        Assert.Equal(1, result.Order);
        Assert.Equal("backlog", result.Status);
    }

    [Fact]
    public async Task Create_InvalidStatus_ThrowsValidationException()
    {
        var service = CreateService();
        var userId = GetUserId();
        var projectId = GetProjectId();

        await Assert.ThrowsAsync<ValidationException>(() => service.CreateAsync(new CreateTaskDto
        {
            Title = "Bad Task",
            ProjectId = projectId,
            Status = "invalid_status",
            Priority = "medium"
        }, userId));
    }

    [Fact]
    public async Task Create_InvalidPriority_ThrowsValidationException()
    {
        var service = CreateService();
        var userId = GetUserId();
        var projectId = GetProjectId();

        await Assert.ThrowsAsync<ValidationException>(() => service.CreateAsync(new CreateTaskDto
        {
            Title = "Bad Task",
            ProjectId = projectId,
            Status = "backlog",
            Priority = "invalid_priority"
        }, userId));
    }

    [Fact]
    public async Task Create_WithSubtasks_PersistsSubtasks()
    {
        var service = CreateService();
        var userId = GetUserId();
        var projectId = GetProjectId();

        var result = await service.CreateAsync(new CreateTaskDto
        {
            Title = "Task with subtasks",
            ProjectId = projectId,
            Status = "backlog",
            Priority = "medium",
            Subtasks = new List<CreateSubtaskDto>
            {
                new() { Title = "Subtask 1", Done = false },
                new() { Title = "Subtask 2", Done = true }
            }
        }, userId);

        Assert.Equal(2, result.Subtasks.Count);
        Assert.Equal("Subtask 1", result.Subtasks[0].Title);
        Assert.False(result.Subtasks[0].Done);
        Assert.Equal("Subtask 2", result.Subtasks[1].Title);
        Assert.True(result.Subtasks[1].Done);
    }

    [Fact]
    public async Task Get_Task_ById_ReturnsCorrectData()
    {
        var service = CreateService();
        var userId = GetUserId();
        var taskId = _context.Tasks.First(t => t.Title == "Task 1").Id;

        var result = await service.GetAsync(taskId, userId);

        Assert.NotNull(result);
        Assert.Equal(taskId, result.Id);
        Assert.Equal("Task 1", result.Title);
    }

    [Fact]
    public async Task Get_NonexistentTask_ReturnsNull()
    {
        var service = CreateService();
        var userId = GetUserId();

        var result = await service.GetAsync(99999, userId);

        Assert.Null(result);
    }

    [Fact]
    public async Task Update_Task_ChangesArePersisted()
    {
        var service = CreateService();
        var userId = GetUserId();
        var taskId = _context.Tasks.First().Id;

        var result = await service.UpdateAsync(taskId, System.Text.Json.JsonDocument.Parse(
            @"{""title"":""Updated Title"",""priority"":""urgent""}").RootElement, userId);

        Assert.NotNull(result);
        Assert.Equal("Updated Title", result.Title);
        Assert.Equal("urgent", result.Priority);

        var persisted = await service.GetAsync(taskId, userId);
        Assert.Equal("Updated Title", persisted!.Title);
        Assert.Equal("urgent", persisted.Priority);
    }

    [Fact]
    public async Task Update_Task_ClearDueDate_SetsNull()
    {
        var service = CreateService();
        var userId = GetUserId();
        var projectId = GetProjectId();

        var created = await service.CreateAsync(new CreateTaskDto
        {
            Title = "Task with due date",
            ProjectId = projectId,
            Status = "backlog",
            Priority = "medium",
            DueDate = DateTime.UtcNow.AddDays(7)
        }, userId);

        var taskId = created.Id;

        var result = await service.UpdateAsync(taskId, System.Text.Json.JsonDocument.Parse(
            @"{""dueDate"":null}").RootElement, userId);

        Assert.Null(result!.DueDate);

        var persisted = await service.GetAsync(taskId, userId);
        Assert.Null(persisted.DueDate);
    }

    [Fact]
    public async Task Update_Task_ClearAssignee_SetsNull()
    {
        var service = CreateService();
        var userId = GetUserId();
        var projectId = GetProjectId();

        var created = await service.CreateAsync(new CreateTaskDto
        {
            Title = "Task with assignee",
            ProjectId = projectId,
            Status = "backlog",
            Priority = "medium",
            AssigneeId = userId
        }, userId);

        var taskId = created.Id;

        var result = await service.UpdateAsync(taskId, System.Text.Json.JsonDocument.Parse(
            @"{""assigneeId"":null}").RootElement, userId);

        Assert.Null(result!.AssigneeId);

        var persisted = await service.GetAsync(taskId, userId);
        Assert.Null(persisted.AssigneeId);
    }

    [Fact]
    public async Task Delete_Task_RemovesIt()
    {
        var service = CreateService();
        var userId = GetUserId();
        var taskId = _context.Tasks.First().Id;

        var result = await service.DeleteAsync(taskId, userId);

        Assert.True(result);

        var persisted = await service.GetAsync(taskId, userId);
        Assert.Null(persisted);
    }

    [Fact]
    public async Task Move_Task_ChangesColumnAndReorders()
    {
        var service = CreateService();
        var userId = GetUserId();
        var projectId = GetProjectId();

        var task = _context.Tasks.First(t => t.Status == "backlog");

        var result = await service.MoveAsync(task.Id, new MoveTaskDto
        {
            Status = "done",
            Index = 0
        }, userId);

        Assert.NotNull(result);
        var moved = result.First(t => t.Id == task.Id);
        Assert.Equal("done", moved.Status);
        Assert.Equal(0, moved.Order);
    }

    [Fact]
    public async Task ToggleSubtask_FlipsDoneStatus()
    {
        var service = CreateService();
        var userId = GetUserId();
        var projectId = GetProjectId();

        var created = await service.CreateAsync(new CreateTaskDto
        {
            Title = "Task with subtask",
            ProjectId = projectId,
            Status = "backlog",
            Priority = "medium",
            Subtasks = new List<CreateSubtaskDto>
            {
                new() { Title = "Subtask", Done = false }
            }
        }, userId);

        var taskId = created.Id;
        var subtaskId = created.Subtasks[0].Id;

        var result = await service.ToggleSubtaskAsync(taskId, subtaskId, userId);

        Assert.NotNull(result);
        Assert.True(result.Subtasks[0].Done);

        result = await service.ToggleSubtaskAsync(taskId, subtaskId, userId);
        Assert.False(result!.Subtasks[0].Done);
    }

    [Fact]
    public async Task AddComment_AssociatesWithAuthenticatedUser()
    {
        var service = CreateService();
        var userId = GetUserId();
        var projectId = GetProjectId();

        var created = await service.CreateAsync(new CreateTaskDto
        {
            Title = "Task for comment",
            ProjectId = projectId,
            Status = "backlog",
            Priority = "medium"
        }, userId);

        var taskId = created.Id;

        var comment = await service.AddCommentAsync(taskId, "Test comment body", userId);

        Assert.NotNull(comment);
        Assert.Equal(userId, comment.AuthorId);
        Assert.Equal("Test comment body", comment.Body);

        var task = await service.GetAsync(taskId, userId);
        Assert.Single(task!.Comments);
        Assert.Equal(userId, task.Comments[0].AuthorId);
    }

    [Fact]
    public async Task Tasks_InDifferentProjects_HaveIndependentOrdering()
    {
        var service = CreateService();
        var userId = GetUserId();

        var project2 = new Project
        {
            Name = "Project 2",
            Description = "Second project",
            Color = "#2563EB",
            Icon = "code",
            Status = "active",
            MemberIds = new List<int> { userId },
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow
        };
        _context.Projects.Add(project2);
        await _context.SaveChangesAsync();

        var t1 = await service.CreateAsync(new CreateTaskDto
        {
            Title = "P1 Task 1",
            ProjectId = GetProjectId(),
            Status = "backlog",
            Priority = "medium"
        }, userId);

        var t2 = await service.CreateAsync(new CreateTaskDto
        {
            Title = "P2 Task 1",
            ProjectId = project2.Id,
            Status = "backlog",
            Priority = "medium"
        }, userId);

        Assert.Equal(1, t1.Order);
        Assert.Equal(0, t2.Order);
    }
}
