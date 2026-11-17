using System.ComponentModel.DataAnnotations;

namespace TaskFlow.Models;

/// <summary>
/// Central repository of domain constants (statuses, priorities, roles, icons).
/// This single source of truth eliminates the duplication that previously lived
/// in AppConstants.cs, src/types/index.ts, and client-side UI maps.
/// </summary>
public static class AppEnums
{
    // --- Task statuses ---
    public static readonly string[] TaskStatuses = ["backlog", "in_progress", "review", "done"];

    // --- Task priorities ---
    public static readonly string[] TaskPriorities = ["low", "medium", "high", "urgent"];

    // --- Project statuses ---
    public static readonly string[] ProjectStatuses = ["active", "paused", "completed"];

    // --- Project icons ---
    public static readonly string[] ProjectIcons = ["rocket", "palette", "code", "chart", "phone", "book"];

    // --- Roles ---
    public static readonly string[] Roles = ["admin", "member", "viewer"];

    // --- Data annotations ---
    // (Removed — validation attributes on class declarations are not supported
    //  in C#. Validation is done via AppEnums.Contains() in service code.)
}
