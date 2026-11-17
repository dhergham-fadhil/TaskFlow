using TaskFlow.Data;
using TaskFlow.Dtos;
using TaskFlow.Models;
using TaskFlow.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;

namespace TaskFlow.Api.Tests;

/// <summary>
/// WorkspaceService tests: project loading, member lookup, demo flag.
/// </summary>
public class WorkspaceServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public WorkspaceServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"workspace_{Guid.NewGuid():N}")
            .Options;
        _context = new ApplicationDbContext(options);

        var configData = new Dictionary<string, string?>
        {
            ["Demo:Enabled"] = "true"
        };
        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();

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
        var outsider = new User
        {
            Email = "outsider@example.com",
            PasswordHash = "hash",
            Name = "Outsider",
            Role = "member"
        };
        _context.Users.AddRange(owner, member, outsider);
        await _context.SaveChangesAsync();

        var project1 = new Project
        {
            Name = "Project 1",
            Description = "Desc",
            Color = "#6D5EF8",
            Icon = "rocket",
            Status = "active",
            Members = new List<ProjectMember> { new ProjectMember { UserId = member.Id, JoinedAt = DateTime.UtcNow } },
            OwnerId = owner.Id,
            CreatedAt = DateTime.UtcNow
        };
        var project2 = new Project
        {
            Name = "Project 2",
            Description = "Desc",
            Color = "#2563EB",
            Icon = "code",
            Status = "active",
            Members = new List<ProjectMember> { },
            OwnerId = outsider.Id,
            CreatedAt = DateTime.UtcNow
        };
        _context.Projects.AddRange(project1, project2);
        await _context.SaveChangesAsync();

        _context.Tasks.AddRange(
            new ProjectTask
            {
                Title = "Task in P1",
                ProjectId = project1.Id,
                Status = "backlog",
                Priority = "medium",
                Order = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new ProjectTask
            {
                Title = "Task in P2",
                ProjectId = project2.Id,
                Status = "backlog",
                Priority = "high",
                Order = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        await _context.SaveChangesAsync();
    }

    private WorkspaceService CreateService(IWebHostEnvironment env) =>
        new(_context, _configuration, env);

    private int GetOwnerId() => _context.Users.First(u => u.Name == "Owner").Id;
    private int GetOutsiderId() => _context.Users.First(u => u.Name == "Outsider").Id;
    private int GetProject1Id() => _context.Projects.First(p => p.Name == "Project 1").Id;

    public void Dispose() => _context.Dispose();

    private class DevEnvironment : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "Test";
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string WebRootPath { get; set; } = string.Empty;
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }

    private class ProductionEnvironment : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Production";
        public string ApplicationName { get; set; } = "Test";
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string WebRootPath { get; set; } = string.Empty;
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }

    [Fact]
    public async Task Owner_SeesAccessibleProjectsOnly()
    {
        var service = CreateService(new DevEnvironment());
        var ownerId = GetOwnerId();

        var workspace = await service.GetWorkspaceAsync(ownerId);

        Assert.Single(workspace.Projects);
        Assert.Equal(GetProject1Id(), workspace.Projects[0].Id);
    }

    [Fact]
    public async Task Outsider_SeesNoProjects()
    {
        var service = CreateService(new DevEnvironment());
        var outsiderId = GetOutsiderId();

        var workspace = await service.GetWorkspaceAsync(outsiderId);

        // Project 2 is owned by outsider — outsider should see it.
        Assert.Single(workspace.Projects);
        Assert.Equal("Project 2", workspace.Projects[0].Name);
    }

    [Fact]
    public async Task DemoEnabled_True_InDevelopment()
    {
        var service = CreateService(new DevEnvironment());
        var ownerId = GetOwnerId();

        var workspace = await service.GetWorkspaceAsync(ownerId);

        Assert.True(workspace.DemoEnabled);
    }

    [Fact]
    public async Task DemoEnabled_False_InProduction()
    {
        var service = CreateService(new ProductionEnvironment());
        var ownerId = GetOwnerId();

        var workspace = await service.GetWorkspaceAsync(ownerId);

        Assert.False(workspace.DemoEnabled);
    }

    [Fact]
    public async Task NonexistentUser_ThrowsForbidden()
    {
        var service = CreateService(new DevEnvironment());

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            service.GetWorkspaceAsync(99999));
    }

    [Fact]
    public async Task Workspace_IncludesMembersOfAccessibleProjects()
    {
        var service = CreateService(new DevEnvironment());
        var ownerId = GetOwnerId();

        var workspace = await service.GetWorkspaceAsync(ownerId);

        // Owner and member of Project 1 should be in members list.
        Assert.Contains(workspace.Members, m => m.Id == ownerId);
        Assert.Contains(workspace.Members, m => m.Email == "member@example.com");
    }
}
