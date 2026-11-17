using TaskFlow.Models;

namespace TaskFlow.Services;

/// <summary>
/// Validation helpers and domain constants that delegate to the single source
/// of truth in AppEnums. Kept for backward compatibility with existing callers.
/// </summary>
public static class AppConstants
{
    public static readonly string[] TaskStatuses = AppEnums.TaskStatuses;
    public static readonly string[] TaskPriorities = AppEnums.TaskPriorities;
    public static readonly string[] ProjectStatuses = AppEnums.ProjectStatuses;
    public static readonly string[] ProjectIcons = AppEnums.ProjectIcons;
    public static readonly string[] Roles = AppEnums.Roles;

    public static bool IsValidTaskStatus(string? value) => AppEnums.TaskStatuses.Contains(value, StringComparer.Ordinal);

    public static bool IsValidTaskPriority(string? value) => AppEnums.TaskPriorities.Contains(value, StringComparer.Ordinal);

    public static bool IsValidProjectStatus(string? value) => AppEnums.ProjectStatuses.Contains(value, StringComparer.Ordinal);

    public static bool IsValidRole(string? value) => AppEnums.Roles.Contains(value, StringComparer.Ordinal);
}
