using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Services;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Api.Tests;

public class TestDatabase : IDisposable
{
    public ApplicationDbContext CreateInMemoryContext(string databaseName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;

        return new ApplicationDbContext(options);
    }

    public void Dispose()
    {
    }
}

/// <summary>
/// Test double for IAuthorizationService that grants access to everything.
/// Tests focus on service behavior, not authorization logic (which is tested
/// separately via AuthorizationService).
/// </summary>
public class FakeAuthorizationService : IAuthorizationService
{
    public Task<bool> CanAccessProjectAsync(int projectId, int userId, CancellationToken ct = default) => Task.FromResult(true);
    public Task<bool> CanManageProjectAsync(int projectId, int userId, CancellationToken ct = default) => Task.FromResult(true);
    public Task<bool> CanAccessTaskAsync(int taskId, int userId, CancellationToken ct = default) => Task.FromResult(true);
}
