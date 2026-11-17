using TaskFlow.Data;
using TaskFlow.Dtos;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Services;

/// <summary>
/// Serves the recent-activity feed. A caller only sees activities that belong
/// to projects they own or are a member of (admins see everything).
/// </summary>
public class ActivityService : IActivityService
{
    private readonly ApplicationDbContext _context;

    public ActivityService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<ActivityResponseDto>> ListAsync(int userId, int page, int pageSize)
    {
        var actor = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);
        var isAdmin = actor?.Role == "admin";

        var accessibleProjectIds = await _context.Projects
            .AsNoTracking()
            .Where(p => isAdmin || p.OwnerId == userId || p.Members.Any(m => m.UserId == userId))
            .Select(p => p.Id)
            .ToListAsync();

        var query = _context.Activities
            .AsNoTracking()
            .Where(a => a.ProjectId == null || accessibleProjectIds.Contains(a.ProjectId.Value));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => a.ToDto())
            .ToListAsync();

        return new PagedResult<ActivityResponseDto>(items, page, pageSize, total);
    }
}
