namespace TaskFlow.Models;

public class Project
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // NEW FIELDS
    public string Color { get; set; } = "#6D5EF8"; // Default violet
    public string Icon { get; set; } = "rocket";   // Default icon
    public string Status { get; set; } = "active"; // active, paused, completed
    public DateTime? DueDate { get; set; }
    public List<int> MemberIds { get; set; } = new();
    /** User who owns the project; only the owner or an admin may modify it */
    public int OwnerId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public List<ProjectTask> Tasks { get; set; } = new();
}