using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace TaskFlow.Api.Tests;

/// <summary>
/// Refresh token lifecycle tests: create, rotate, revoke, revoke-all.
/// </summary>
public class RefreshTokenTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly IRefreshTokenService _service;

    public RefreshTokenTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"refreshtoken_{Guid.NewGuid():N}")
            .Options;
        _context = new ApplicationDbContext(options);

        var configData = new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-test-test-test-test-test-test-test",
            ["Jwt:Issuer"] = "TaskFlowApi",
            ["Jwt:Audience"] = "TaskFlowClient"
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();

        _service = new RefreshTokenService(_context, configuration);
    }

    private async Task SeedUser()
    {
        _context.Users.Add(new User
        {
            Email = "user@example.com",
            PasswordHash = "hash",
            Name = "Refresh User",
            Role = "member"
        });
        await _context.SaveChangesAsync();
    }

    private int GetUserId() => _context.Users.First().Id;

    public void Dispose() => _context.Dispose();

    [Fact]
    public async Task Create_ReturnsNonEmptyToken()
    {
        await SeedUser();
        var userId = GetUserId();

        var token = await _service.CreateAsync(userId);

        Assert.False(string.IsNullOrWhiteSpace(token));
    }

    [Fact]
    public async Task Create_StoresTokenWithExpiry()
    {
        await SeedUser();
        var userId = GetUserId();

        var token = await _service.CreateAsync(userId);

        var stored = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.UserId == userId);
        Assert.NotNull(stored);
        Assert.True(stored.IsActive);
        Assert.True(stored.ExpiresAt > DateTime.UtcNow);
        Assert.Null(stored.ReplacedByToken);
    }

    [Fact]
    public async Task Rotate_ValidToken_ReturnsNewAccessAndRefreshToken()
    {
        await SeedUser();
        var userId = GetUserId();

        var oldToken = await _service.CreateAsync(userId);
        var (accessToken, newRefreshToken) = await _service.RotateAsync(oldToken);

        Assert.NotNull(accessToken);
        Assert.NotNull(newRefreshToken);
        Assert.NotEqual(oldToken, newRefreshToken);

        // Old token should be revoked.
        var oldHash = ComputeHash(oldToken);
        var oldStored = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.UserId == userId && rt.TokenHash == oldHash);
        Assert.NotNull(oldStored);
        Assert.False(oldStored.IsActive);
        Assert.NotNull(oldStored.RevokedAt);
    }

    [Fact]
    public async Task Rotate_RevokedToken_ReturnsNull()
    {
        await SeedUser();
        var userId = GetUserId();

        var oldToken = await _service.CreateAsync(userId);
        await _service.RevokeAsync(oldToken);

        var (accessToken, newRefreshToken) = await _service.RotateAsync(oldToken);

        Assert.Null(accessToken);
        Assert.Null(newRefreshToken);
    }

    [Fact]
    public async Task Rotate_UnknownToken_ReturnsNull()
    {
        await SeedUser();

        var (accessToken, newRefreshToken) = await _service.RotateAsync("nonexistent-token");

        Assert.Null(accessToken);
        Assert.Null(newRefreshToken);
    }

    [Fact]
    public async Task Revoke_MakesTokenInactive()
    {
        await SeedUser();
        var userId = GetUserId();

        var token = await _service.CreateAsync(userId);
        await _service.RevokeAsync(token);

        var stored = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.UserId == userId);
        Assert.NotNull(stored);
        Assert.False(stored.IsActive);
        Assert.NotNull(stored.RevokedAt);
    }

    [Fact]
    public async Task RevokeAll_RevokesAllUserTokens()
    {
        await SeedUser();
        var userId = GetUserId();

        var token1 = await _service.CreateAsync(userId);
        var token2 = await _service.CreateAsync(userId);

        await _service.RevokeAllAsync(userId);

        var activeTokens = await _context.RefreshTokens
            .CountAsync(rt => rt.UserId == userId && rt.RevokedAt == null);
        Assert.Equal(0, activeTokens);
    }

    [Fact]
    public async Task Rotate_CreatesRotationChain()
    {
        await SeedUser();
        var userId = GetUserId();

        var token1 = await _service.CreateAsync(userId);
        var (_, token2) = await _service.RotateAsync(token1);
        var (_, token3) = await _service.RotateAsync(token2!);

        // Each rotation should create a new token record.
        var tokenCount = await _context.RefreshTokens.CountAsync(rt => rt.UserId == userId);
        Assert.Equal(3, tokenCount);

        // The latest token should not have a replacement yet.
        var latest = await _context.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .OrderByDescending(rt => rt.CreatedAt)
            .FirstAsync();
        Assert.Null(latest.ReplacedByToken);
    }

    private static string ComputeHash(string token)
    {
        using var sha = System.Security.Cryptography.SHA256.Create();
        var hash = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(hash);
    }
}
