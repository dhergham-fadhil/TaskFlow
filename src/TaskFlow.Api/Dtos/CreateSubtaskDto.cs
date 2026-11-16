using System.ComponentModel.DataAnnotations;

namespace TaskFlow.Dtos;

public class CreateSubtaskDto
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    public bool Done { get; set; }
}
