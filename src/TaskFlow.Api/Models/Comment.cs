namespace TaskFlow.Models;

public class Comment
{
    public int Id { get; set; }
    public string Body { get; set; } = string.Empty;
    public int AuthorId { get; set; } // User ID
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int TaskId { get; set; } // Foreign key to ProjectTask
    public ProjectTask? Task { get; set; } // Navigation property
}