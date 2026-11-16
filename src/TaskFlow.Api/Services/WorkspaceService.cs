using TaskFlow.Data;
using TaskFlow.Dtos;
using TaskFlow.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Hosting;

namespace TaskFlow.Services;

public class WorkspaceService : IWorkspaceService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _env;

    public WorkspaceService(ApplicationDbContext context, IConfiguration configuration, IWebHostEnvironment env)
    {
        _context = context;
        _configuration = configuration;
        _env = env;
    }

    public async Task<WorkspaceResponseDto> GetWorkspaceAsync(int userId)
    {
        var actor = await _context.Users.FindAsync(userId)
            ?? throw new ForbiddenException("User not found.");

        var isAdmin = actor.Role == "admin";

        var projects = await _context.Projects
            .Include(p => p.Tasks)
                .ThenInclude(t => t.Subtasks)
            .Include(p => p.Tasks)
                .ThenInclude(t => t.Comments)
            .AsNoTracking()
            .Where(p => isAdmin || p.OwnerId == userId || p.MemberIds.Contains(userId))
            .OrderBy(p => p.Id)
            .ToListAsync();

        var projectIds = projects.Select(p => p.Id).ToList();

        var tasks = await _context.Tasks
            .Include(t => t.Subtasks)
            .Include(t => t.Comments)
            .AsNoTracking()
            .Where(t => projectIds.Contains(t.ProjectId))
            .OrderBy(t => t.Status)
            .ThenBy(t => t.Order)
            .ToListAsync();

        // Members: everyone who owns or is a member of a visible project.
        var memberIds = projects
            .SelectMany(p => p.MemberIds)
            .Union(projects.Select(p => p.OwnerId))
            .Distinct()
            .ToList();

        var members = await _context.Users
            .AsNoTracking()
            .Where(u => memberIds.Contains(u.Id))
            .OrderBy(u => u.Id)
            .ToListAsync();

        var activities = await _context.Activities
            .AsNoTracking()
            .Where(a => a.ProjectId == null || projectIds.Contains(a.ProjectId.Value))
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .Take(50)
            .ToListAsync();

        return new WorkspaceResponseDto
        {
            Projects = projects.Select(p => p.ToDto()).ToList(),
            Tasks = tasks.Select(t => t.ToDto()).ToList(),
            Members = members.Select(m => m.ToDto(m.Id == userId)).ToList(),
            Activities = activities.Select(a => a.ToDto()).ToList(),
            CurrentUserId = userId,
            DemoEnabled = _configuration.GetValue("Demo:Enabled", false) && _env.IsDevelopment()
        };
    }
}
