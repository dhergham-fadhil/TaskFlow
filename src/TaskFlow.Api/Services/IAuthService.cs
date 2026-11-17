using TaskFlow.Dtos;

namespace TaskFlow.Services;

public interface IAuthService
{
    Task<(bool Success, string? Token, string? RefreshToken, string? Error)> Register(RegisterDto dto);
    Task<(bool Success, string? Token, string? RefreshToken, string? Error)> Login(LoginDto dto);
}