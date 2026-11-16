namespace TaskFlow.Models;

public class Activity
{
    public int Id { get; set; }
    public int ActorId { get; set; }
    public User? Actor { get; set; }
    /** e.g. "created", "completed", "commented on", "moved", "updated" */
    public string Action { get; set; } = string.Empty;
    /** e.g. task title or project name */
    public string Target { get; set; } = string.Empty;
    /** create | complete | comment | move | project | update */
    public string Kind { get; set; } = "update";
    public int? ProjectId { get; set; }
    public int? TaskId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
