using TaskFlow.Data;
using TaskFlow.Dtos;
using TaskFlow.Models;
using TaskFlow.Services;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Api.Tests;

/// <summary>
/// Concurrency tests for task creation and movement.
/// Uses parallel execution to exercise retry logic under simultaneous writes.
/// </summary>
public class ConcurrencyTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly FakeAuthorizationService _auth;

    public ConcurrencyTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"concurrency_{Guid.NewGuid():N}")
            .Options;
        _context = new ApplicationDbContext(options);
        _auth = new FakeAuthorizationService();
        SeedDatabase().Wait();
    }

    private async Task SeedDatabase()
    {
        var user = new User
        {
            Email = "user@example.com",
            PasswordHash = "hash",
            Name = "Concurrency User",
            Role = "member"
        };
        _context.Users.Add(user);

        var project = new Project
        {
            Name = "Concurrency Project",
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
    }

    private TaskService CreateService() => new(_context, _auth);

    private int GetUserId() => _context.Users.First().Id;
    private int GetProjectId() => _context.Projects.First().Id;

    public void Dispose() => _context.Dispose();

    [Fact]
    public async Task ConcurrentTaskCreation_ProducesDistinctOrders()
    {
        var service = CreateService();
        var userId = GetUserId();
        var projectId = GetProjectId();

        // Launch 10 concurrent creates in the same column.
        var tasks = Enumerable.Range(0, 10).Select(i =>
            service.CreateAsync(new CreateTaskDto
            {
                Title = $"Concurrent Task {i}",
                ProjectId = projectId,
                Status = "backlog",
                Priority = "medium"
            }, userId)).ToArray();

        var results = await Task.WhenAll(tasks);

        // All must succeed.
        Assert.All(results, r => Assert.NotNull(r));
        Assert.Equal(10, results.Length);

        // Orders must be distinct (no duplicates from concurrent Max(Order) reads).
        var orders = results.Select(r => r!.Order).OrderBy(o => o).ToList();
        Assert.Equal(orders.Distinct().Count(), orders.Count);

        // Orders must be sequential with the gap-based strategy (0, 1000, 2000, ...).
        Assert.Equal(0m, orders[0]);
        for (var i = 1; i < orders.Count; i++)
            Assert.Equal(1000m, orders[i] - orders[i - 1]);
    }

    [Fact]
    public async Task ConcurrentTaskMove_OneWinsWithoutException()
    {
        var service = CreateService();
        var userId = GetUserId();
        var projectId = GetProjectId();

        // Create two tasks in backlog.
        var t1 = await service.CreateAsync(new CreateTaskDto
        {
            Title = "Move Task 1",
            ProjectId = projectId,
            Status = "backlog",
            Priority = "medium"
        }, userId);
        var t2 = await service.CreateAsync(new CreateTaskDto
        {
            Title = "Move Task 2",
            ProjectId = projectId,
            Status = "backlog",
            Priority = "medium"
        }, userId);

        // Both tasks concurrently move to "done" at index 0.
        // One will win; the other retries and should also succeed
        // (no unhandled exception).
        var results = await Task.WhenAll(
            service.MoveAsync(t1.Id, new MoveTaskDto { Status = "done", Index = 0 }, userId),
            service.MoveAsync(t2.Id, new MoveTaskDto { Status = "done", Index = 0 }, userId));

        Assert.All(results, r => Assert.NotNull(r));
        Assert.Equal(2, results.Length);

        // Both tasks must end up in "done".
        var doneTasks = await _context.Tasks
            .Where(t => t.Status == "done")
            .CountAsync();
        Assert.Equal(2, doneTasks);
    }

    [Fact]
    public async Task OrderingConsistency_NoDuplicatePositions()
    {
        var service = CreateService();
        var userId = GetUserId();
        var projectId = GetProjectId();

        // Create 5 tasks in the same column.
        for (var i = 0; i < 5; i++)
        {
            await service.CreateAsync(new CreateTaskDto
            {
                Title = $"Order Test {i}",
                ProjectId = projectId,
                Status = "backlog",
                Priority = "medium"
            }, userId);
        }

        // All orders must be distinct.
        var orders = await _context.Tasks
            .Where(t => t.Status == "backlog")
            .Select(t => t.Order)
            .ToListAsync();

        Assert.Equal(orders.Distinct().Count(), orders.Count);
    }
}
