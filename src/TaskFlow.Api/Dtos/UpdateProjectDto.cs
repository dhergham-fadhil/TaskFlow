using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TaskFlow.Dtos;

/// <summary>
/// Typed, validated payload for PATCH /api/projects/{id}.
/// Replaces raw JsonElement patch handling so updates cannot silently
/// modify protected properties (Id, OwnerId, CreatedAt).
/// </summary>
public class UpdateProjectDto
{
    [StringLength(100, MinimumLength = 3)]
    public string? Name { get; set; }

    [StringLength(500)]
    public string? Description { get; set; }

    [RegularExpression(@"^#[0-9a-fA-F]{6}$")]
    public string? Color { get; set; }

    public string? Icon { get; set; }

    public string? Status { get; set; }

    public DateTime? DueDate { get; set; }

    [JsonPropertyName("memberIds")]
    public List<int>? MemberIds { get; set; }
}
