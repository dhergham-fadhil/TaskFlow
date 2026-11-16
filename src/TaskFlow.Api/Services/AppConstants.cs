namespace TaskFlow.Services;

/// <summary>
/// Central definition of allowed enum-like values so the backend contract
/// stays in sync with the frontend TypeScript types in src/types/index.ts.
/// </summary>
public static class AppConstants
{
    public static readonly string[] TaskStatuses = ["backlog", "in_progress", "review", "done"];

    public static readonly string[] TaskPriorities = ["low", "medium", "high", "urgent"];

    public static readonly string[] ProjectStatuses = ["active", "paused", "completed"];

    public static readonly string[] ProjectIcons = ["rocket", "palette", "code", "chart", "phone", "book"];

    public static readonly string[] Roles = ["admin", "member", "viewer"];

    public static bool IsValidTaskStatus(string? value) =>
        value is not null && TaskStatuses.Contains(value, StringComparer.Ordinal);

    public static bool IsValidTaskPriority(string? value) =>
        value is not null && TaskPriorities.Contains(value, StringComparer.Ordinal);

    public static bool IsValidProjectStatus(string? value) =>
        value is not null && ProjectStatuses.Contains(value, StringComparer.Ordinal);

    public static bool IsValidRole(string? value) =>
        value is not null && Roles.Contains(value, StringComparer.Ordinal);
}
