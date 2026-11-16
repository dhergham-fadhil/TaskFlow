using TaskFlow.Data;
using TaskFlow.Dtos;
using TaskFlow.Models;
using TaskFlow.Services;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Api.Tests;

public class ProjectServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;

    public ProjectServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"projects_{Guid.NewGuid():N}")
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
        _context.Users.AddRange(owner, member);
        await _context.SaveChangesAsync();

        var project = new Project
        {
            Name = "Test Project",
            Description = "Desc",
            Color = "#6D5EF8",
            Icon = "rocket",
            Status = "active",
            MemberIds = new List<int> { owner.Id, member.Id },
            OwnerId = owner.Id,
            CreatedAt = DateTime.UtcNow
        };
        _context.Projects.Add(project);
        await _context.SaveChangesAsync();
    }

    private ProjectService CreateService() => new(_context);

    private int GetOwnerId() => _context.Users.First(u => u.Name == "Owner").Id;
    private int GetMemberId() => _context.Users.First(u => u.Name == "Member").Id;
    private int GetProjectId() => _context.Projects.First().Id;

    public void Dispose() => _context.Dispose();

    [Fact]
    public async Task Create_Project_PersistsWithMembers()
    {
        var service = CreateService();
        var ownerId = GetOwnerId();
        var memberId = GetMemberId();

        var result = await service.CreateAsync(new CreateProjectDto
        {
            Name = "New Project",
            Description = "A new project",
            Color = "#2563EB",
            Icon = "code",
            Status = "active",
            DueDate = null,
            MemberIds = new List<int> { memberId }
        }, ownerId);

        Assert.NotNull(result);
        Assert.Equal("New Project", result.Name);
        Assert.Contains(memberId, result.MemberIds);
        Assert.Contains(ownerId, result.MemberIds);
    }

    [Fact]
    public async Task Create_Project_InvalidStatus_Throws()
    {
        var service = CreateService();
        var ownerId = GetOwnerId();

        await Assert.ThrowsAsync<ValidationException>(() => service.CreateAsync(new CreateProjectDto
        {
            Name = "Bad Project",
            Status = "invalid_status"
        }, ownerId));
    }

    [Fact]
    public async Task UpdateProjectStatus_ChangesStatus()
    {
        var service = CreateService();
        var ownerId = GetOwnerId();
        var projectId = GetProjectId();

        var result = await service.SetStatusAsync(projectId, "paused", ownerId);

        Assert.NotNull(result);
        Assert.Equal("paused", result.Status);

        var persisted = await service.GetAsync(projectId, ownerId);
        Assert.Equal("paused", persisted!.Status);
    }

    [Fact]
    public async Task UpdateProjectStatus_InvalidStatus_Throws()
    {
        var service = CreateService();
        var ownerId = GetOwnerId();
        var projectId = GetProjectId();

        await Assert.ThrowsAsync<ValidationException>(() => service.SetStatusAsync(projectId, "invalid", ownerId));
    }

    [Fact]
    public async Task Update_Project_ChangesPersist()
    {
        var service = CreateService();
        var ownerId = GetOwnerId();
        var projectId = GetProjectId();

        var result = await service.UpdateAsync(projectId, System.Text.Json.JsonDocument.Parse(
            @"{""name"":""Renamed Project"",""status"":""completed""}").RootElement, ownerId);

        Assert.NotNull(result);
        Assert.Equal("Renamed Project", result.Name);
        Assert.Equal("completed", result.Status);
    }

    [Fact]
    public async Task AddMember_AddsUserToProject()
    {
        var service = CreateService();
        var ownerId = GetOwnerId();
        var memberId = GetMemberId();
        var projectId = GetProjectId();

        _context.Projects.First().MemberIds = new List<int> { ownerId };
        await _context.SaveChangesAsync();

        var result = await service.AddMemberAsync(projectId, memberId, ownerId);

        Assert.True(result);

        var project = await service.GetAsync(projectId, ownerId);
        Assert.Contains(memberId, project!.MemberIds);
    }

    [Fact]
    public async Task RemoveMember_RemovesUserFromProject()
    {
        var service = CreateService();
        var ownerId = GetOwnerId();
        var memberId = GetMemberId();
        var projectId = GetProjectId();

        var result = await service.RemoveMemberAsync(projectId, memberId, ownerId);

        Assert.True(result);

        var project = await service.GetAsync(projectId, ownerId);
        Assert.DoesNotContain(memberId, project!.MemberIds);
    }

    [Fact]
    public async Task RemoveMember_CannotRemoveOwner()
    {
        var service = CreateService();
        var ownerId = GetOwnerId();
        var projectId = GetProjectId();

        var result = await service.RemoveMemberAsync(projectId, ownerId, ownerId);

        Assert.False(result);
    }

    [Fact]
    public async Task Delete_Project_RemovesIt()
    {
        var service = CreateService();
        var ownerId = GetOwnerId();
        var projectId = GetProjectId();

        var result = await service.DeleteAsync(projectId, ownerId);

        Assert.True(result);

        var persisted = await service.GetAsync(projectId, ownerId);
        Assert.Null(persisted);
    }

    [Fact]
    public async Task NonOwner_CannotManageProject()
    {
        var service = CreateService();
        var memberId = GetMemberId();
        var projectId = GetProjectId();

        var deleteResult = await service.DeleteAsync(projectId, memberId);
        Assert.False(deleteResult);

        var statusResult = await service.SetStatusAsync(projectId, "paused", memberId);
        Assert.Null(statusResult);
    }
}
