using TaskFlow.Data;
using TaskFlow.Models;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Services;

public static class DatabaseSeeder
{
/// <summary>
/// Seeds the demo administrator account and sample workspace.
/// Only runs when the database is empty, demo seeding is enabled,
/// and the environment is Development. Never introduces insecure
/// default credentials — Demo:Email and Demo:Password must be
/// explicitly configured via environment variables or user secrets.
/// </summary>
public static async Task SeedAsync(ApplicationDbContext context, IConfiguration configuration, bool isDevelopment)
{
    if (await context.Users.AnyAsync())
        return;

    if (!isDevelopment)
        return;

    var demoEnabled = configuration.GetValue("Demo:Enabled", false);
    if (!demoEnabled)
        return;

    var demoEmail = configuration["Demo:Email"];
    var demoPassword = configuration["Demo:Password"];
    if (string.IsNullOrWhiteSpace(demoEmail) || string.IsNullOrWhiteSpace(demoPassword))
        return;

    var demoName = configuration["Demo:Name"] ?? "Demo User";

    var user = new User
    {
        Email = demoEmail,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(demoPassword),
        Name = demoName,
        Role = "admin",
        CreatedAt = DateTime.UtcNow
    };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var project1 = new Project
        {
            Name = "Task Management App",
            Description = "Web app for managing tasks and projects",
            Color = "#6D5EF8",
            Icon = "rocket",
            Status = "active",
            DueDate = new DateTime(2026, 12, 31),
            Members = new List<ProjectMember> { new ProjectMember { UserId = user.Id, JoinedAt = DateTime.UtcNow } },
            OwnerId = user.Id,
            CreatedAt = DateTime.UtcNow
        };

        var project2 = new Project
        {
            Name = "UI Design",
            Description = "User interface design for TaskFlow app",
            Color = "#8B5CF6",
            Icon = "palette",
            Status = "active",
            DueDate = new DateTime(2026, 11, 30),
            Members = new List<ProjectMember> { new ProjectMember { UserId = user.Id, JoinedAt = DateTime.UtcNow } },
            OwnerId = user.Id,
            CreatedAt = DateTime.UtcNow
        };

        var project3 = new Project
        {
            Name = "Database Setup",
            Description = "Setting up SQL Server database",
            Color = "#10B981",
            Icon = "code",
            Status = "completed",
            DueDate = null,
            Members = new List<ProjectMember> { new ProjectMember { UserId = user.Id, JoinedAt = DateTime.UtcNow } },
            OwnerId = user.Id,
            CreatedAt = DateTime.UtcNow
        };

        context.Projects.AddRange(project1, project2, project3);
        await context.SaveChangesAsync();

        // Orders are unique per (project, status) column so the Kanban board
        // renders deterministically after reloads.
        var now = DateTime.UtcNow;
        context.Tasks.AddRange(
            new ProjectTask { Title = "Project Setup", Description = "Create basic project structure", Status = "done", Priority = "high", ProjectId = project1.Id, AssigneeId = user.Id, Order = 0, CreatedAt = now, UpdatedAt = now },
            new ProjectTask { Title = "Database Schema", Description = "Create database tables", Status = "in_progress", Priority = "high", ProjectId = project1.Id, AssigneeId = user.Id, Order = 0, CreatedAt = now, UpdatedAt = now },
            new ProjectTask { Title = "API Endpoints", Description = "Build REST API endpoints", Status = "backlog", Priority = "medium", ProjectId = project1.Id, AssigneeId = user.Id, Order = 0, CreatedAt = now, UpdatedAt = now },
            new ProjectTask { Title = "Logo Design", Description = "Design TaskFlow logo", Status = "review", Priority = "medium", ProjectId = project2.Id, AssigneeId = user.Id, Order = 0, CreatedAt = now, UpdatedAt = now },
            new ProjectTask { Title = "Color Scheme", Description = "Choose color palette", Status = "done", Priority = "low", ProjectId = project2.Id, AssigneeId = user.Id, Order = 0, CreatedAt = now, UpdatedAt = now }
        );

        await context.SaveChangesAsync();

        var tasks = await context.Tasks
            .AsNoTracking()
            .Where(t => t.ProjectId == project1.Id || t.ProjectId == project2.Id)
            .OrderBy(t => t.Id)
            .ToListAsync();

        context.Activities.AddRange(
            new Activity
            {
                ActorId = user.Id,
                Action = "created",
                Target = project1.Name,
                Kind = "project",
                ProjectId = project1.Id,
                CreatedAt = now.AddMinutes(-40)
            },
            new Activity
            {
                ActorId = user.Id,
                Action = "created",
                Target = tasks.Count > 0 ? tasks[0].Title : "First task",
                Kind = "create",
                ProjectId = project1.Id,
                TaskId = tasks.Count > 0 ? tasks[0].Id : null,
                CreatedAt = now.AddMinutes(-35)
            },
            new Activity
            {
                ActorId = user.Id,
                Action = "commented on",
                Target = tasks.Count > 1 ? tasks[1].Title : "Second task",
                Kind = "comment",
                ProjectId = project1.Id,
                TaskId = tasks.Count > 1 ? tasks[1].Id : null,
                CreatedAt = now.AddMinutes(-10)
            }
        );

        await context.SaveChangesAsync();
    }
}
