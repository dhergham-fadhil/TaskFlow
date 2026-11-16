using TaskFlow.Data;
using TaskFlow.Dtos;
using TaskFlow.Models;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Configuration;

namespace TaskFlow.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    public AuthService(ApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<(bool Success, string? Token, string? Error)> Register(RegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return (false, null, "Name is required.");
        var name = dto.Name.Trim();

        if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(dto.Email))
            return (false, null, "A valid email address is required.");

        if (dto.Password.Length < 8)
            return (false, null, "Password must be at least 8 characters.");

        // Normalize the email so lookups are case-insensitive regardless of collation.
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        // Check if email already exists
        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (existingUser != null)
        {
            return (false, null, "Email already registered");
        }

        // Hash the password
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        // Create user
        var user = new User
        {
            Email = normalizedEmail,
            PasswordHash = passwordHash,
            Name = name,
            Role = "member"
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return (true, GenerateJwtToken(user), null);
    }

    public async Task<(bool Success, string? Token, string? Error)> Login(LoginDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user == null)
        {
            return (false, null, "Invalid email or password");
        }

        // Verify password
        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return (false, null, "Invalid email or password");
        }

        return (true, GenerateJwtToken(user), null);
    }

    private string GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Email, user.Email),
        new Claim(ClaimTypes.Name, user.Name),
        new Claim(ClaimTypes.Role, user.Role)
    };

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}