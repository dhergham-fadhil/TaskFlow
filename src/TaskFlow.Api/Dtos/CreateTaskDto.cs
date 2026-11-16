using System.ComponentModel.DataAnnotations;

namespace TaskFlow.Dtos;

public class CreateTaskDto
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [Required]
    public int ProjectId { get; set; }

    public string Status { get; set; } = "backlog";

    public string Priority { get; set; } = "medium";

    public int? AssigneeId { get; set; }

    public List<string> Labels { get; set; } = new();

    public DateTime? DueDate { get; set; }

    /** Optional initial subtasks; ids assigned by the server. */
    public List<CreateSubtaskDto> Subtasks { get; set; } = new();
}
