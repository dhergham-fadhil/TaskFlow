namespace TaskFlow.Dtos;

public class ProjectResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? DueDate { get; set; }
    public List<int> MemberIds { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public List<TaskResponseDto> Tasks { get; set; } = new();
}