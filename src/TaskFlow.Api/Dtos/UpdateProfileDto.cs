using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TaskFlow.Dtos;

/// <summary>
/// Typed, validated payload for PUT /api/users/me.
/// Replaces raw JsonElement patch handling for profile updates.
/// </summary>
public class UpdateProfileDto
{
    [StringLength(100, MinimumLength = 1)]
    public string? Name { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    public string? Role { get; set; }
}
