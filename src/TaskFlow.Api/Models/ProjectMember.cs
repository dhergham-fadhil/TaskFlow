namespace TaskFlow.Models;

/// <summary>
/// Relational many-to-many membership between a project and a user.
/// Replaces the denormalized Project.MemberIds primitive collection.
/// </summary>
public class ProjectMember
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public int UserId { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public Project Project { get; set; } = null!;
    public User User { get; set; } = null!;
}