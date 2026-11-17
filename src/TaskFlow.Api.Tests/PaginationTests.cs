using TaskFlow.Data;
using TaskFlow.Dtos;
using TaskFlow.Models;
using TaskFlow.Services;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Api.Tests;

/// <summary>
/// Pagination boundary tests.
/// </summary>
public class PaginationTests : IDisposable
{
    private readonly ApplicationDbContext _context;

    public PaginationTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"pagination_{Guid.NewGuid():N}")
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
            Name = "Pagination User",
            Role = "member"
        };
        _context.Users.Add(user);

        var project = new Project
        {
            Name = "Pagination Project",
            Description = "Desc",
            Color = "#6D5EF8",
            Icon = "rocket",
            Status = "active",
            Members = new List<ProjectMember> { new ProjectMember { UserId = user.Id, JoinedAt = DateTime.UtcNow } },
            OwnerId = user.Id,
            CreatedAt = DateTime.UtcNow
        };
        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        for (var i = 0; i < 25; i++)
        {
            _context.Tasks.Add(new ProjectTask
            {
                Title = $"Pagination Task {i}",
                ProjectId = project.Id,
                Status = "backlog",
                Priority = "medium",
                Order = i,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
        await _context.SaveChangesAsync();
    }

    private TaskService CreateService() => new(_context, new FakeAuthorizationService());

    private int GetUserId() => _context.Users.First().Id;
    private int GetProjectId() => _context.Projects.First().Id;

    public void Dispose() => _context.Dispose();

    [Fact]
    public async Task PageZero_ThrowsValidationException()
    {
        var service = CreateService();
        var userId = GetUserId();

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.ListAsync(userId, null, null, 0, 50));
    }

    [Fact]
    public async Task NegativePage_ThrowsValidationException()
    {
        var service = CreateService();
        var userId = GetUserId();

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.ListAsync(userId, null, null, -1, 50));
    }

    [Fact]
    public async Task PageSizeOverMax_ThrowsValidationException()
    {
        var service = CreateService();
        var userId = GetUserId();

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.ListAsync(userId, null, null, 1, 101));
    }

    [Fact]
    public async Task PageSizeZero_ThrowsValidationException()
    {
        var service = CreateService();
        var userId = GetUserId();

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.ListAsync(userId, null, null, 1, 0));
    }

    [Fact]
    public async Task FirstPage_ReturnsPageSizeItems()
    {
        var service = CreateService();
        var userId = GetUserId();

        var result = await service.ListAsync(userId, null, null, 1, 10);

        Assert.Equal(10, result.Items.Count);
        Assert.Equal(25, result.Total);
        Assert.Equal(1, result.Page);
    }

    [Fact]
    public async Task LastPage_ReturnsRemainingItems()
    {
        var service = CreateService();
        var userId = GetUserId();

        // 25 items, page size 10: page 3 has 5 items.
        var result = await service.ListAsync(userId, null, null, 3, 10);

        Assert.Equal(5, result.Items.Count);
        Assert.Equal(25, result.Total);
        Assert.Equal(3, result.Page);
    }

    [Fact]
    public async Task PageBeyondData_ReturnsEmpty()
    {
        var service = CreateService();
        var userId = GetUserId();

        var result = await service.ListAsync(userId, null, null, 100, 10);

        Assert.Empty(result.Items);
        Assert.Equal(25, result.Total);
    }

    [Fact]
    public async Task FilterByProject_ReturnsOnlyMatching()
    {
        var service = CreateService();
        var userId = GetUserId();
        var projectId = GetProjectId();

        // Create a second project with its own task.
        var project2 = new Project
        {
            Name = "Other Project",
            Description = "Desc",
            Color = "#2563EB",
            Icon = "code",
            Status = "active",
            Members = new List<ProjectMember> { new ProjectMember { UserId = userId, JoinedAt = DateTime.UtcNow } },
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow
        };
        _context.Projects.Add(project2);
        await _context.SaveChangesAsync();

        _context.Tasks.Add(new ProjectTask
        {
            Title = "Other Project Task",
            ProjectId = project2.Id,
            Status = "backlog",
            Priority = "medium",
            Order = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var result = await service.ListAsync(userId, projectId, null, 1, 50);

        // Only tasks from the first project (25) should be returned.
        Assert.Equal(25, result.Total);
        Assert.All(result.Items, t => Assert.Equal(projectId, t.ProjectId));
    }
}
