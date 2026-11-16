using System.ComponentModel.DataAnnotations;

namespace TaskFlow.Dtos;

public class CreateProjectDto
{
    [Required]
    [StringLength(100, MinimumLength = 3)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string Description { get; set; } = string.Empty;

    [RegularExpression(@"^#[0-9a-fA-F]{6}$")]
    public string Color { get; set; } = "#6D5EF8";

    public string Icon { get; set; } = "rocket";

    public string Status { get; set; } = "active";

    public DateTime? DueDate { get; set; }

    /** IDs of users to add as members; the creator is always included. */
    public List<int> MemberIds { get; set; } = new();
}
