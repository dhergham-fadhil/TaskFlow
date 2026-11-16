namespace TaskFlow.Dtos;

public class SubTaskResponseDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool Done { get; set; }
}
