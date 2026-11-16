using System.ComponentModel.DataAnnotations;

namespace TaskFlow.Dtos;

public class AddCommentDto
{
    [Required]
    [StringLength(2000, MinimumLength = 1)]
    public string Body { get; set; } = string.Empty;
}
