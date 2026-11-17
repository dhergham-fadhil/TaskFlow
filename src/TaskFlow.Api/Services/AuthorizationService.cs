using TaskFlow.Data;
using TaskFlow.Models;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Services;

/// <summary>
/// Resource-level authorization. A user may access a project when they own it,
/// are a member of it, or are an administrator. Only owners and administrators
/// may manage a project.
/// </summary>
public interface IAuthorizationService
{
    Task<bool> CanAccessProjectAsync(int projectId, int userId, CancellationToken ct = default);
    Task<bool> CanManageProjectAsync(int projectId, int userId, CancellationToken ct = default);
    Task<bool> CanAccessTaskAsync(int taskId, int userId, CancellationToken ct = default);
}

public class AuthorizationService : IAuthorizationService
{
    private readonly ApplicationDbContext _context;

    public AuthorizationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> CanAccessProjectAsync(int projectId, int userId, CancellationToken ct = default)
    {
        var actorRole = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.Role)
            .FirstOrDefaultAsync(ct);
        if (actorRole == "admin") return true;

        return await _context.Projects
            .AsNoTracking()
            .Where(p => p.Id == projectId && (p.OwnerId == userId || p.Members.Any(m => m.UserId == userId)))
            .AnyAsync(ct);
    }

    public async Task<bool> CanManageProjectAsync(int projectId, int userId, CancellationToken ct = default)
    {
        var actorRole = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.Role)
            .FirstOrDefaultAsync(ct);
        if (actorRole == "admin") return true;

        return await _context.Projects
            .AsNoTracking()
            .Where(p => p.Id == projectId && p.OwnerId == userId)
            .AnyAsync(ct);
    }

    public async Task<bool> CanAccessTaskAsync(int taskId, int userId, CancellationToken ct = default)
    {
        var projectId = await _context.Tasks
            .AsNoTracking()
            .Where(t => t.Id == taskId)
            .Select(t => t.ProjectId)
            .FirstOrDefaultAsync(ct);
        if (projectId == 0) return false;
        return await CanAccessProjectAsync(projectId, userId, ct);
    }
}
