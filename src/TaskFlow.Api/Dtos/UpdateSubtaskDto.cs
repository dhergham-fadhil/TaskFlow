using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TaskFlow.Dtos;

/// <summary>
/// Subtask payload for task updates. Id is optional: absent ids create new
/// subtasks; present ids target existing rows for update.
/// </summary>
public class UpdateSubtaskDto
{
    public int? Id { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    public bool Done { get; set; }
}
