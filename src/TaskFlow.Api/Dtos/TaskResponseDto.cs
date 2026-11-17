namespace TaskFlow.Dtos;

public class TaskResponseDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public int ProjectId { get; set; }
    public int? AssigneeId { get; set; }
    public List<string> Labels { get; set; } = new();
    public DateTime? DueDate { get; set; }
    public decimal Order { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<SubTaskResponseDto> Subtasks { get; set; } = new();
    public List<CommentResponseDto> Comments { get; set; } = new();
}