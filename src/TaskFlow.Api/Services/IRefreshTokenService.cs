using TaskFlow.Models;

namespace TaskFlow.Services;

/// <summary>
/// Refresh-token lifecycle: issue, validate, rotate, and revoke.
/// </summary>
public interface IRefreshTokenService
{
    Task<string> CreateAsync(int userId, string? ipAddress = null);
    Task<(string? AccessToken, string? RefreshToken)> RotateAsync(string refreshToken, string? ipAddress = null);
    Task RevokeAsync(string refreshToken, string? ipAddress = null);
    Task RevokeAllAsync(int userId);
}
