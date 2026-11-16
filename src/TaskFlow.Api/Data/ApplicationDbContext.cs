using Microsoft.EntityFrameworkCore;
using TaskFlow.Models;

namespace TaskFlow.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Project> Projects { get; set; }
    public DbSet<ProjectTask> Tasks { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<SubTask> SubTasks { get; set; }
    public DbSet<Comment> Comments { get; set; } = null!;
    public DbSet<Activity> Activities { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Cascade deletes so removing a project or task also removes its children.
        modelBuilder.Entity<ProjectTask>()
            .HasOne(t => t.Project)
            .WithMany(p => p.Tasks)
            .HasForeignKey(t => t.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SubTask>()
            .HasOne(s => s.Task)
            .WithMany(t => t.Subtasks)
            .HasForeignKey(s => s.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Comment>()
            .HasOne(c => c.Task)
            .WithMany(t => t.Comments)
            .HasForeignKey(c => c.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        // Soft-delete-safe ordering: unique order per (project, status) column.
        modelBuilder.Entity<ProjectTask>()
            .HasIndex(t => new { t.ProjectId, t.Status, t.Order })
            .IsUnique();
    }
}