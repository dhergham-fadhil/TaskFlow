using System.Text.Json;
using System.Text.Json.Serialization;

namespace TaskFlow.Dtos;

/// <summary>
/// Typed, validated payload for PATCH /api/tasks/{id}.
/// Replaces raw JsonElement patch handling so updates cannot silently
/// modify protected properties (Id, ProjectId, CreatedAt, UpdatedAt, Order).
///
/// Nullable scalar fields use JsonElement? so the service can distinguish
/// "not provided" (null) from "explicitly set to null" (JsonElement with
/// Null value kind) — required for clearing dueDate or assignee.
/// </summary>
public class UpdateTaskDto
{
    public string? Title { get; set; }

    public string? Description { get; set; }

    public string? Status { get; set; }

    public string? Priority { get; set; }

    public JsonElement? AssigneeId { get; set; }

    public List<string>? Labels { get; set; }

    public JsonElement? DueDate { get; set; }

    [JsonPropertyName("subtasks")]
    public List<UpdateSubtaskDto>? Subtasks { get; set; }
}
