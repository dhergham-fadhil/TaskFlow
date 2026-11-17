using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;

namespace TaskFlow.Api.Tests;

/// <summary>
/// DatabaseSeeder tests: demo seeding safety — Development-only, no hardcoded creds.
/// </summary>
public class DatabaseSeederTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public DatabaseSeederTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"seeder_{Guid.NewGuid():N}")
            .Options;
        _context = new ApplicationDbContext(options);
    }

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

    private IConfiguration ConfigWithDemo(string email, string password, bool enabled = true) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Demo:Enabled"] = enabled.ToString(),
                ["Demo:Email"] = email,
                ["Demo:Password"] = password
            })
            .Build();

    private IConfiguration ConfigWithoutDemo() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Demo:Enabled"] = "false"
            })
            .Build();

    public void Dispose() => _context.Dispose();

    [Fact]
    public async Task Seed_Development_WithCredentials_CreatesDemoUser()
    {
        var config = ConfigWithDemo("demo@example.com", "DemoPass123!");

        await DatabaseSeeder.SeedAsync(_context, config, true);

        var demoUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "demo@example.com");
        Assert.NotNull(demoUser);
        Assert.Equal("admin", demoUser.Role);
    }

    [Fact]
    public async Task Seed_Production_DoesNotCreateDemoUser()
    {
        var config = ConfigWithDemo("demo@example.com", "DemoPass123!");

        await DatabaseSeeder.SeedAsync(_context, config, false);

        var demoUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "demo@example.com");
        Assert.Null(demoUser);
    }

    [Fact]
    public async Task Seed_DemoDisabled_DoesNotCreateDemoUser()
    {
        var config = ConfigWithoutDemo();

        await DatabaseSeeder.SeedAsync(_context, config, true);

        Assert.Empty(_context.Users);
    }

    [Fact]
    public async Task Seed_MissingCredentials_DoesNotCreateDemoUser()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Demo:Enabled"] = "true"
                // No Demo:Email or Demo:Password
            })
            .Build();

        await DatabaseSeeder.SeedAsync(_context, config, true);

        Assert.Empty(_context.Users);
    }

    [Fact]
    public async Task Seed_WhenUsersExist_DoesNotReseed()
    {
        var config = ConfigWithDemo("demo@example.com", "DemoPass123!");

        // Pre-existing user.
        _context.Users.Add(new User
        {
            Email = "existing@example.com",
            PasswordHash = "hash",
            Name = "Existing",
            Role = "member"
        });
        await _context.SaveChangesAsync();

        await DatabaseSeeder.SeedAsync(_context, config, true);

        var demoUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "demo@example.com");
        Assert.Null(demoUser);
        Assert.Single(_context.Users);
    }
}
