using TaskFlow.Data;
using TaskFlow.Dtos;
using TaskFlow.Models;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Services;

public class UserService : IUserService
{
    private readonly ApplicationDbContext _context;

    public UserService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserResponseDto?> GetProfileAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        return user?.ToDto(includeEmail: true);
    }

    public async Task<UserResponseDto?> UpdateProfileAsync(int userId, System.Text.Json.JsonElement patch)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user is null) return null;

        if (patch.TryGetProperty("name", out var name) && name.ValueKind is System.Text.Json.JsonValueKind.String)
        {
            var newName = name.GetString()?.Trim();
            if (string.IsNullOrWhiteSpace(newName))
                throw new ValidationException("Name cannot be empty.");
            user.Name = newName;
        }

        if (patch.TryGetProperty("email", out var email) && email.ValueKind is System.Text.Json.JsonValueKind.String)
        {
            var newEmail = email.GetString()?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(newEmail) || !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(newEmail))
                throw new ValidationException("A valid email address is required.");

            var taken = await _context.Users.AnyAsync(u => u.Email == newEmail && u.Id != userId);
            if (taken) throw new ValidationException("That email is already in use.");
            user.Email = newEmail;
        }

        // Role changes are restricted to administrators.
        if (patch.TryGetProperty("role", out var role) && role.ValueKind is System.Text.Json.JsonValueKind.String)
        {
            var actor = await _context.Users.FindAsync(userId);
            if (actor?.Role != "admin")
                throw new ForbiddenException("Only administrators can change roles.");
            var newRole = role.GetString();
            if (newRole is null || !AppConstants.IsValidRole(newRole))
                throw new ValidationException($"Invalid role. Allowed: {string.Join(", ", AppConstants.Roles)}");
            user.Role = newRole;
        }

        await _context.SaveChangesAsync();
        return user.ToDto(includeEmail: true);
    }
}
