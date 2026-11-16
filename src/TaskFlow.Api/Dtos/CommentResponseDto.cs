namespace TaskFlow.Dtos;

public class CommentResponseDto
{
    public int Id { get; set; }
    public string Body { get; set; } = string.Empty;
    public int AuthorId { get; set; }
    public DateTime CreatedAt { get; set; }
}