using TaskFlow.Data;
using TaskFlow.Dtos;
using TaskFlow.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace TaskFlow.Api.Tests;

public class AuthServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"auth_{Guid.NewGuid():N}")
            .Options;
        _context = new ApplicationDbContext(options);

        var configData = new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-test-test-test-test-test-test-test",
            ["Jwt:Issuer"] = "TaskFlowApi",
            ["Jwt:Audience"] = "TaskFlowClient",
            ["Demo:Enabled"] = "false"
        };
        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();
    }

    private AuthService CreateService() => new(_context, _configuration);

    public void Dispose() => _context.Dispose();

    [Fact]
    public async Task Register_CreatesUser_WithHashedPassword()
    {
        var service = CreateService();
        var dto = new RegisterDto
        {
            Name = "Alice",
            Email = "alice@example.com",
            Password = "SecurePass123!"
        };

        var result = await service.Register(dto);

        Assert.True(result.Success);
        Assert.NotNull(result.Token);
        Assert.Null(result.Error);

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == "alice@example.com");
        Assert.NotNull(user);
        Assert.NotEqual("SecurePass123!", user.PasswordHash);
        Assert.Equal("Alice", user.Name);
        Assert.Equal("member", user.Role);
    }

    [Fact]
    public async Task Register_DuplicateEmail_ReturnsError()
    {
        var service = CreateService();
        await service.Register(new RegisterDto
        {
            Name = "Alice",
            Email = "alice@example.com",
            Password = "SecurePass123!"
        });

        var result = await service.Register(new RegisterDto
        {
            Name = "Alice 2",
            Email = "alice@example.com",
            Password = "SecurePass123!"
        });

        Assert.False(result.Success);
        Assert.Equal("Email already registered", result.Error);
        Assert.Null(result.Token);
    }

    [Fact]
    public async Task Register_ShortPassword_ReturnsError()
    {
        var service = CreateService();
        var result = await service.Register(new RegisterDto
        {
            Name = "Alice",
            Email = "alice@example.com",
            Password = "short"
        });

        Assert.False(result.Success);
        Assert.Equal("Password must be at least 8 characters.", result.Error);
    }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsToken()
    {
        var service = CreateService();
        await service.Register(new RegisterDto
        {
            Name = "Alice",
            Email = "alice@example.com",
            Password = "SecurePass123!"
        });

        var result = await service.Login(new LoginDto
        {
            Email = "alice@example.com",
            Password = "SecurePass123!"
        });

        Assert.True(result.Success);
        Assert.NotNull(result.Token);
    }

    [Fact]
    public async Task Login_WrongPassword_ReturnsError()
    {
        var service = CreateService();
        await service.Register(new RegisterDto
        {
            Name = "Alice",
            Email = "alice@example.com",
            Password = "SecurePass123!"
        });

        var result = await service.Login(new LoginDto
        {
            Email = "alice@example.com",
            Password = "WrongPass123!"
        });

        Assert.False(result.Success);
        Assert.Equal("Invalid email or password", result.Error);
    }

    [Fact]
    public async Task Login_UnknownEmail_ReturnsError()
    {
        var service = CreateService();
        var result = await service.Login(new LoginDto
        {
            Email = "unknown@example.com",
            Password = "SecurePass123!"
        });

        Assert.False(result.Success);
        Assert.Equal("Invalid email or password", result.Error);
    }
}
