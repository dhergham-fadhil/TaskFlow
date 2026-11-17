using TaskFlow.Data;
using TaskFlow.Dtos;
using TaskFlow.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Hosting;
using System.Linq;

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
        var actor = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new ForbiddenException("User not found.");

        var isAdmin = actor.Role == "admin";

        // Single query for accessible project IDs.
        var projectIds = await _context.Projects
            .Where(p => isAdmin || p.OwnerId == userId || p.Members.Any(m => m.UserId == userId))
            .Select(p => p.Id)
            .OrderBy(id => id)
            .ToListAsync();

        if (projectIds.Count == 0)
        {
            return new WorkspaceResponseDto
            {
                Projects = new(),
                Tasks = new(),
                Members = new(),
                Activities = new(),
                CurrentUserId = userId,
                DemoEnabled = _configuration.GetValue("Demo:Enabled", false) && _env.IsDevelopment()
            };
        }

        // Projects as lightweight projections — no task/subtask/comment graph.
        var projects = await _context.Projects
            .AsNoTracking()
            .Where(p => projectIds.Contains(p.Id))
            .OrderBy(p => p.Id)
            .Select(p => new ProjectResponseDto
            {
                Id = p.Id,
                Name = p.Name,
                Description = p.Description,
                Color = p.Color,
                Icon = p.Icon,
                Status = p.Status,
                DueDate = p.DueDate,
                MemberIds = p.Members.Select(m => m.UserId).ToList(),
                CreatedAt = p.CreatedAt,
                Tasks = new List<TaskResponseDto>()
            })
            .ToListAsync();

        // Members: all distinct users across accessible projects (owners + members).
        var memberUserIds = await _context.Projects
            .Where(p => projectIds.Contains(p.Id))
            .SelectMany(p => p.Members.Select(m => m.UserId))
            .Concat(_context.Projects.Where(p => projectIds.Contains(p.Id)).Select(p => p.OwnerId))
            .Distinct()
            .ToListAsync();

        var members = await _context.Users
            .AsNoTracking()
            .Where(u => memberUserIds.Contains(u.Id))
            .OrderBy(u => u.Id)
            .Select(u => new UserResponseDto
            {
                Id = u.Id,
                Name = u.Name,
                Email = u.Email,
                Role = u.Role
            })
            .ToListAsync();

        // Paginated tasks — capped page size prevents loading the entire graph.
        const int pageSize = 200;
        var tasks = await _context.Tasks
            .AsNoTracking()
            .Where(t => projectIds.Contains(t.ProjectId))
            .OrderBy(t => t.Status)
            .ThenBy(t => t.Order)
            .ThenBy(t => t.Id)
            .Take(pageSize)
            .Select(t => new TaskResponseDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Status = t.Status,
                Priority = t.Priority,
                ProjectId = t.ProjectId,
                AssigneeId = t.AssigneeId,
                Labels = t.Labels,
                DueDate = t.DueDate,
                Order = t.Order,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt,
                Subtasks = new List<SubTaskResponseDto>(),
                Comments = new List<CommentResponseDto>()
            })
            .ToListAsync();

        var activities = await _context.Activities
            .AsNoTracking()
            .Where(a => a.ProjectId == null || projectIds.Contains(a.ProjectId.Value))
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .Take(50)
            .Select(a => new ActivityResponseDto
            {
                Id = a.Id,
                ActorId = a.ActorId,
                Action = a.Action,
                Target = a.Target,
                Kind = a.Kind,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return new WorkspaceResponseDto
        {
            Projects = projects,
            Tasks = tasks,
            Members = members,
            Activities = activities,
            CurrentUserId = userId,
            DemoEnabled = _configuration.GetValue("Demo:Enabled", false) && _env.IsDevelopment()
        };
    }
}
