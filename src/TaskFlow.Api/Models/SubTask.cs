namespace TaskFlow.Models;

public class SubTask
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool Done { get; set; } = false;
    public int TaskId { get; set; } // Foreign key to ProjectTask
    public ProjectTask? Task { get; set; } // Navigation property
}