namespace TaskFlow.Dtos;

public class WorkspaceResponseDto
{
    public List<ProjectResponseDto> Projects { get; set; } = new();
    public List<TaskResponseDto> Tasks { get; set; } = new();
    public List<UserResponseDto> Members { get; set; } = new();
    public List<ActivityResponseDto> Activities { get; set; } = new();
    public int CurrentUserId { get; set; }
    public bool DemoEnabled { get; set; }
}