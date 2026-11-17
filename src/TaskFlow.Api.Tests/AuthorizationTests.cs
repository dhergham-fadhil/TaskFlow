using TaskFlow.Data;
using TaskFlow.Dtos;
using TaskFlow.Models;
using TaskFlow.Services;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Api.Tests;

/// <summary>
/// Authorization tests: distinguish 403 (Forbidden) from 404 (Not Found).
/// Uses the real AuthorizationService (not FakeAuthorizationService).
/// </summary>
public class AuthorizationTests : IDisposable
{
    private readonly ApplicationDbContext _context;

    public AuthorizationTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"authorization_{Guid.NewGuid():N}")
            .Options;
        _context = new ApplicationDbContext(options);
        SeedDatabase().Wait();
    }

    private async Task SeedDatabase()
    {
        var owner = new User
        {
            Email = "owner@example.com",
            PasswordHash = "hash",
            Name = "Owner",
            Role = "member"
        };
        var member = new User
        {
            Email = "member@example.com",
            PasswordHash = "hash",
            Name = "Member",
            Role = "member"
        };
        var outsider = new User
        {
            Email = "outsider@example.com",
            PasswordHash = "hash",
            Name = "Outsider",
            Role = "member"
        };
        var admin = new User
        {
            Email = "admin@example.com",
            PasswordHash = "hash",
            Name = "Admin",
            Role = "admin"
        };
        _context.Users.AddRange(owner, member, outsider, admin);
        await _context.SaveChangesAsync();

        var project = new Project
        {
            Name = "Auth Project",
            Description = "Desc",
            Color = "#6D5EF8",
            Icon = "rocket",
            Status = "active",
            Members = new List<ProjectMember> { new ProjectMember { UserId = member.Id, JoinedAt = DateTime.UtcNow } },
            OwnerId = owner.Id,
            CreatedAt = DateTime.UtcNow
        };
        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        var task = new ProjectTask
        {
            Title = "Auth Task",
            ProjectId = project.Id,
            Status = "backlog",
            Priority = "medium",
            Order = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();
    }

    private TaskService CreateTaskService() => new(_context, new AuthorizationService(_context));
    private ProjectService CreateProjectService() => new(_context, new AuthorizationService(_context));

    private int GetOwnerId() => _context.Users.First(u => u.Name == "Owner").Id;
    private int GetMemberId() => _context.Users.First(u => u.Name == "Member").Id;
    private int GetOutsiderId() => _context.Users.First(u => u.Name == "Outsider").Id;
    private int GetAdminId() => _context.Users.First(u => u.Name == "Admin").Id;
    private int GetProjectId() => _context.Projects.First().Id;
    private int GetTaskId() => _context.Tasks.First().Id;

    public void Dispose() => _context.Dispose();

    [Fact]
    public async Task Owner_CanAccessOwnProject()
    {
        var service = CreateProjectService();
        var result = await service.GetAsync(GetProjectId(), GetOwnerId());
        Assert.NotNull(result);
    }

    [Fact]
    public async Task Member_CanAccessMemberProject()
    {
        var service = CreateProjectService();
        var result = await service.GetAsync(GetProjectId(), GetMemberId());
        Assert.NotNull(result);
    }

    [Fact]
    public async Task Outsider_CannotAccessProject_ReturnsNull()
    {
        var service = CreateProjectService();
        var result = await service.GetAsync(GetProjectId(), GetOutsiderId());
        Assert.Null(result);
    }

    [Fact]
    public async Task Admin_CanAccessAnyProject()
    {
        var service = CreateProjectService();
        var result = await service.GetAsync(GetProjectId(), GetAdminId());
        Assert.NotNull(result);
    }

    [Fact]
    public async Task Outsider_CannotManageProject_ReturnsFalse()
    {
        var service = CreateProjectService();
        var result = await service.DeleteAsync(GetProjectId(), GetOutsiderId());
        Assert.False(result);
    }

    [Fact]
    public async Task NonOwner_CannotManageProject_ReturnsFalse()
    {
        var service = CreateProjectService();
        var result = await service.DeleteAsync(GetProjectId(), GetMemberId());
        Assert.False(result);
    }

    [Fact]
    public async Task TaskExists_ButOutsiderLacksAccess_ThrowsForbidden()
    {
        var service = CreateTaskService();
        var taskId = GetTaskId();

        // Task exists, but outsider can't access it -> ForbiddenException (403), not null.
        await Assert.ThrowsAsync<ForbiddenException>(() =>
            service.GetAsync(taskId, GetOutsiderId()));
    }

    [Fact]
    public async Task NonexistentTask_ReturnsNull_NotForbidden()
    {
        var service = CreateTaskService();

        // Task doesn't exist -> null, not an exception.
        var result = await service.GetAsync(99999, GetAdminId());
        Assert.Null(result);
    }

    [Fact]
    public async Task Outsider_CannotMoveTask_ThrowsForbidden()
    {
        var service = CreateTaskService();
        var taskId = GetTaskId();

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            service.MoveAsync(taskId, new MoveTaskDto { Status = "done", Index = 0 }, GetOutsiderId()));
    }

    [Fact]
    public async Task Outsider_CannotUpdateTask_ThrowsForbidden()
    {
        var service = CreateTaskService();
        var taskId = GetTaskId();

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            service.UpdateAsync(taskId, new UpdateTaskDto { Title = "Hacked" }, GetOutsiderId()));
    }

    [Fact]
    public async Task Owner_CanUpdateOwnTask()
    {
        var service = CreateTaskService();
        var taskId = GetTaskId();

        var result = await service.UpdateAsync(taskId, new UpdateTaskDto { Title = "Updated by Owner" }, GetOwnerId());
        Assert.NotNull(result);
        Assert.Equal("Updated by Owner", result.Title);
    }
}
