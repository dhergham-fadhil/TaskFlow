namespace TaskFlow.Dtos;

public class ActivityResponseDto
{
    public int Id { get; set; }
    public int ActorId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    /** create | complete | comment | move | project | update */
    public string Kind { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
