using TaskFlow.Data;
using TaskFlow.Dtos;
using TaskFlow.Services;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Api.Tests;

public class UserServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;

    public UserServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"users_{Guid.NewGuid():N}")
            .Options;
        _context = new ApplicationDbContext(options);
        SeedDatabase().Wait();
    }

    private async Task SeedDatabase()
    {
        _context.Users.AddRange(
            new TaskFlow.Models.User
            {
                Email = "user@example.com",
                PasswordHash = "hash",
                Name = "Regular User",
                Role = "member"
            },
            new TaskFlow.Models.User
            {
                Email = "admin@example.com",
                PasswordHash = "hash",
                Name = "Admin User",
                Role = "admin"
            }
        );
        await _context.SaveChangesAsync();
    }

    private UserService CreateService() => new(_context);

    public void Dispose() => _context.Dispose();

    [Fact]
    public async Task GetProfile_ReturnsUserDetails()
    {
        var service = CreateService();
        var userId = _context.Users.First(u => u.Email == "user@example.com").Id;

        var result = await service.GetProfileAsync(userId);

        Assert.NotNull(result);
        Assert.Equal("Regular User", result.Name);
        Assert.Equal("user@example.com", result.Email);
    }

    [Fact]
    public async Task UpdateProfile_ChangesNameAndEmail()
    {
        var service = CreateService();
        var userId = _context.Users.First(u => u.Email == "user@example.com").Id;

        var result = await service.UpdateProfileAsync(userId, new UpdateProfileDto { Name = "Updated Name", Email = "updated@example.com" });

        Assert.NotNull(result);
        Assert.Equal("Updated Name", result.Name);
        Assert.Equal("updated@example.com", result.Email);

        var persisted = await service.GetProfileAsync(userId);
        Assert.Equal("Updated Name", persisted!.Name);
        Assert.Equal("updated@example.com", persisted.Email);
    }

    [Fact]
    public async Task UpdateProfile_DuplicateEmail_Throws()
    {
        var service = CreateService();
        var userId = _context.Users.First(u => u.Email == "user@example.com").Id;

        await Assert.ThrowsAsync<ValidationException>(() => service.UpdateProfileAsync(userId, new UpdateProfileDto { Email = "admin@example.com" }));
    }

    [Fact]
    public async Task UpdateProfile_InvalidEmail_Throws()
    {
        var service = CreateService();
        var userId = _context.Users.First(u => u.Email == "user@example.com").Id;

        await Assert.ThrowsAsync<ValidationException>(() => service.UpdateProfileAsync(userId, new UpdateProfileDto { Email = "not-an-email" }));
    }

    [Fact]
    public async Task UpdateProfile_EmptyName_Throws()
    {
        var service = CreateService();
        var userId = _context.Users.First(u => u.Email == "user@example.com").Id;

        await Assert.ThrowsAsync<ValidationException>(() => service.UpdateProfileAsync(userId, new UpdateProfileDto { Name = "   " }));
    }

    [Fact]
    public async Task UpdateProfile_NonAdmin_CannotChangeRole()
    {
        var service = CreateService();
        var regularUserId = _context.Users.First(u => u.Email == "user@example.com").Id;

        await Assert.ThrowsAsync<ForbiddenException>(() => service.UpdateProfileAsync(regularUserId, new UpdateProfileDto { Role = "admin" }));
    }

    [Fact]
    public async Task UpdateProfile_AdminCanChangeRole()
    {
        var service = CreateService();
        var adminId = _context.Users.First(u => u.Email == "admin@example.com").Id;

        var result = await service.UpdateProfileAsync(adminId, new UpdateProfileDto { Role = "viewer" });

        Assert.NotNull(result);
        Assert.Equal("viewer", result.Role);
    }
}
