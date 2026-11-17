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

    public async Task<UserResponseDto?> UpdateProfileAsync(int userId, UpdateProfileDto patch)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user is null) return null;

        if (patch.Name is not null)
        {
            var newName = patch.Name.Trim();
            if (string.IsNullOrWhiteSpace(newName))
                throw new ValidationException("Name cannot be empty.");
            user.Name = newName;
        }

        if (!string.IsNullOrWhiteSpace(patch.Email))
        {
            var newEmail = patch.Email.Trim().ToLowerInvariant();
            if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(newEmail))
                throw new ValidationException("A valid email address is required.");

            var taken = await _context.Users.AnyAsync(u => u.Email == newEmail && u.Id != userId);
            if (taken) throw new ValidationException("That email is already in use.");
            user.Email = newEmail;
        }

        // Role changes are restricted to administrators.
        if (!string.IsNullOrWhiteSpace(patch.Role))
        {
            var actor = await _context.Users.FindAsync(userId);
            if (actor?.Role != "admin")
                throw new ForbiddenException("Only administrators can change roles.");
            if (!AppEnums.Roles.Contains(patch.Role, StringComparer.Ordinal))
                throw new ValidationException($"Invalid role. Allowed: {string.Join(", ", AppEnums.Roles)}");
            user.Role = patch.Role;
        }

        await _context.SaveChangesAsync();
        return user.ToDto(includeEmail: true);
    }
}
