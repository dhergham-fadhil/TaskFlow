using System.ComponentModel.DataAnnotations;

namespace TaskFlow.Dtos;

public class MoveTaskDto
{
    [Required]
    public string Status { get; set; } = string.Empty;

    [Required]
    [Range(0, int.MaxValue, ErrorMessage = "Index must be zero or greater.")]
    public int Index { get; set; }
}
