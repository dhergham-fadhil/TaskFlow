using System.ComponentModel.DataAnnotations;

namespace TaskFlow.Dtos;

public class SetProjectStatusDto
{
    [Required]
    public string Status { get; set; } = string.Empty;
}
