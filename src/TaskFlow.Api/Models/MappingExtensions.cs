using TaskFlow.Models;
using TaskFlow.Dtos;

namespace TaskFlow.Services;

public static class MappingExtensions
{
    /// <summary>
    /// Timestamps are stored as SQL datetime2, which round-trips with
    /// DateTimeKind.Unspecified. Without an explicit UTC kind System.Text.Json
    /// emits no offset, and browsers parse the value as local time — making
    /// fresh activity look hours old. Due dates are intentionally left alone:
    /// they are calendar dates, not instants.
    /// </summary>
    private static DateTime AsUtc(DateTime value) =>
        value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);

    public static ProjectResponseDto ToDto(this Project p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Description = p.Description,
        Color = p.Color,
        Icon = p.Icon,
        Status = p.Status,
        DueDate = p.DueDate,
        MemberIds = p.MemberIds,
        CreatedAt = AsUtc(p.CreatedAt),
        Tasks = p.Tasks.Select(t => t.ToDto()).ToList()
    };

    public static TaskResponseDto ToDto(this ProjectTask t) => new()
    {
        Id = t.Id,
        Title = t.Title,
        Description = t.Description,
        Status = t.Status,
        Priority = t.Priority,
        ProjectId = t.ProjectId,
        AssigneeId = t.AssigneeId,
        Labels = t.Labels,
        DueDate = t.DueDate,
        Order = t.Order,
        CreatedAt = AsUtc(t.CreatedAt),
        UpdatedAt = AsUtc(t.UpdatedAt),
        Subtasks = t.Subtasks
            .OrderBy(s => s.Id)
            .Select(s => new SubTaskResponseDto
            {
                Id = s.Id,
                Title = s.Title,
                Done = s.Done
            }).ToList(),
        Comments = t.Comments
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentResponseDto
            {
                Id = c.Id,
                Body = c.Body,
                AuthorId = c.AuthorId,
                CreatedAt = AsUtc(c.CreatedAt)
            }).ToList()
    };

    public static UserResponseDto ToDto(this User u, bool includeEmail) => new()
    {
        Id = u.Id,
        Name = u.Name,
        Email = includeEmail ? u.Email : string.Empty,
        Role = u.Role
    };

    public static ActivityResponseDto ToDto(this Activity a) => new()
    {
        Id = a.Id,
        ActorId = a.ActorId,
        Action = a.Action,
        Target = a.Target,
        Kind = a.Kind,
        CreatedAt = AsUtc(a.CreatedAt)
    };
}
