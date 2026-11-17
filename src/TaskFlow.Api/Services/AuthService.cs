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
    private readonly IRefreshTokenService _refreshTokenService;

    public AuthService(ApplicationDbContext context, IConfiguration configuration, IRefreshTokenService refreshTokenService)
    {
        _context = context;
        _configuration = configuration;
        _refreshTokenService = refreshTokenService;
    }

    public async Task<(bool Success, string? Token, string? RefreshToken, string? Error)> Register(RegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return (false, null, null, "Name is required.");
        var name = dto.Name.Trim();

        if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(dto.Email))
            return (false, null, null, "A valid email address is required.");

        if (dto.Password.Length < 8)
            return (false, null, null, "Password must be at least 8 characters.");

        // Require at least one letter and one digit.
        var hasLetter = dto.Password.Any(char.IsLetter);
        var hasDigit = dto.Password.Any(char.IsDigit);
        if (!hasLetter || !hasDigit)
            return (false, null, null, "Password must contain at least one letter and one digit.");

        // Normalize the email so lookups are case-insensitive regardless of collation.
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        // Check if email already exists — generic failure to avoid enumeration.
        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (existingUser != null)
        {
            return (false, null, null, "Invalid email or password.");
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

        var token = GenerateJwtToken(user);
        var refreshToken = await _refreshTokenService.CreateAsync(user.Id);

        return (true, token, refreshToken, null);
    }

    public async Task<(bool Success, string? Token, string? RefreshToken, string? Error)> Login(LoginDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user == null)
        {
            return (false, null, null, "Invalid email or password");
        }

        // Verify password
        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return (false, null, null, "Invalid email or password");
        }

        var token = GenerateJwtToken(user);
        var refreshToken = await _refreshTokenService.CreateAsync(user.Id);

        return (true, token, refreshToken, null);
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
