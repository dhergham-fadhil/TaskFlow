using TaskFlow.Data;
using TaskFlow.Dtos;
using TaskFlow.Models;
using TaskFlow.Services;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Api.Tests;

/// <summary>
/// Project membership relationship tests.
/// </summary>
public class ProjectMembershipTests : IDisposable
{
    private readonly ApplicationDbContext _context;

    public ProjectMembershipTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"membership_{Guid.NewGuid():N}")
            .Options;
        _context = new ApplicationDbContext(options);
        SeedDatabase().Wait();
    }

    private async Task SeedDatabase()
    {
        var owner = new User
        {
            Email = "owner@example.com",
            PasswordHash = "hash",
            Name = "Owner",
            Role = "member"
        };
        var member = new User
        {
            Email = "member@example.com",
            PasswordHash = "hash",
            Name = "Member",
            Role = "member"
        };
        var newUser = new User
        {
            Email = "newuser@example.com",
            PasswordHash = "hash",
            Name = "New User",
            Role = "member"
        };
        _context.Users.AddRange(owner, member, newUser);
        await _context.SaveChangesAsync();

        var project = new Project
        {
            Name = "Membership Project",
            Description = "Desc",
            Color = "#6D5EF8",
            Icon = "rocket",
            Status = "active",
            Members = new List<ProjectMember>
            {
                new ProjectMember { UserId = owner.Id, JoinedAt = DateTime.UtcNow },
                new ProjectMember { UserId = member.Id, JoinedAt = DateTime.UtcNow }
            },
            OwnerId = owner.Id,
            CreatedAt = DateTime.UtcNow
        };
        _context.Projects.Add(project);
        await _context.SaveChangesAsync();
    }

    private ProjectService CreateService() => new(_context, new FakeAuthorizationService());

    private int GetOwnerId() => _context.Users.First(u => u.Name == "Owner").Id;
    private int GetMemberId() => _context.Users.First(u => u.Name == "Member").Id;
    private int GetNewUserId() => _context.Users.First(u => u.Name == "New User").Id;
    private int GetProjectId() => _context.Projects.First().Id;

    public void Dispose() => _context.Dispose();

    [Fact]
    public async Task AddMember_AddsProjectMemberRelationship()
    {
        var service = CreateService();
        var ownerId = GetOwnerId();
        var newUserId = GetNewUserId();
        var projectId = GetProjectId();

        var result = await service.AddMemberAsync(projectId, newUserId, ownerId);
        Assert.True(result);

        var membership = await _context.ProjectMembers
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == newUserId);
        Assert.NotNull(membership);
    }

    [Fact]
    public async Task RemoveMember_RemovesProjectMemberRelationship()
    {
        var service = CreateService();
        var ownerId = GetOwnerId();
        var memberId = GetMemberId();
        var projectId = GetProjectId();

        var result = await service.RemoveMemberAsync(projectId, memberId, ownerId);
        Assert.True(result);

        var membership = await _context.ProjectMembers
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == memberId);
        Assert.Null(membership);
    }

    [Fact]
    public async Task CannotRemoveOwner()
    {
        var service = CreateService();
        var ownerId = GetOwnerId();
        var projectId = GetProjectId();

        var result = await service.RemoveMemberAsync(projectId, ownerId, ownerId);
        Assert.False(result);
    }

    [Fact]
    public async Task DuplicateMembership_PreventedByUniqueIndex()
    {
        var service = CreateService();
        var ownerId = GetOwnerId();
        var memberId = GetMemberId();
        var projectId = GetProjectId();

        // Add member first time.
        var result1 = await service.AddMemberAsync(projectId, memberId, ownerId);
        Assert.True(result1);

        // Add same member again — should be idempotent or throw.
        var existing = await _context.ProjectMembers
            .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == memberId);
        Assert.True(existing);

        // Adding again should not create duplicates.
        var result2 = await service.AddMemberAsync(projectId, memberId, ownerId);
        Assert.True(result2);

        var count = await _context.ProjectMembers
            .CountAsync(pm => pm.ProjectId == projectId && pm.UserId == memberId);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task MemberIds_ReflectRelationalMembership()
    {
        var service = CreateService();
        var ownerId = GetOwnerId();
        var projectId = GetProjectId();

        var project = await service.GetAsync(projectId, ownerId);
        Assert.NotNull(project);

        // Owner and member should both be in MemberIds.
        Assert.Contains(ownerId, project.MemberIds);
        Assert.Contains(GetMemberId(), project.MemberIds);
    }
}
