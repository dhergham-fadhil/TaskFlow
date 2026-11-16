using TaskFlow.Models;

namespace TaskFlow.Services;

/// <summary>
/// Resource-level authorization helpers. A user may access a project when they
/// own it, are a member of it, or are an administrator.
/// </summary>
public static class AccessControl
{
    public static bool CanAccessProject(User? actor, Project project) =>
        actor is not null &&
        (actor.Role == "admin" || project.OwnerId == actor.Id || project.MemberIds.Contains(actor.Id));

    public static bool CanManageProject(User? actor, Project project) =>
        actor is not null && (actor.Role == "admin" || project.OwnerId == actor.Id);
}
