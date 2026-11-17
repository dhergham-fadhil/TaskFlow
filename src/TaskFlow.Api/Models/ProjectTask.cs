using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Models;

public class ProjectTask
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // NEW FIELDS
    public string Status { get; set; } = "backlog"; // backlog, in_progress, review, done
    public string Priority { get; set; } = "medium"; // low, medium, high, urgent
    public int? AssigneeId { get; set; }            // User ID (nullable)
    public List<string> Labels { get; set; } = new();
    public DateTime? DueDate { get; set; }
    public decimal Order { get; set; } = 0;         // Position in column (gap-based, fractional)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Optimistic-concurrency token: EF Core includes the original value in every
    // UPDATE/DELETE so conflicting writes surface as DbUpdateConcurrencyException.
    [Timestamp]
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    // Relationship
    public int ProjectId { get; set; }
    public Project? Project { get; set; }

    // NEW: Navigation properties for subtasks and comments
    public List<SubTask> Subtasks { get; set; } = new();
    public List<Comment> Comments { get; set; } = new();
}