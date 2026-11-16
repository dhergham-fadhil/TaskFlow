using TaskFlow.Dtos;

namespace TaskFlow.Services;

public interface IAuthService
{
    Task<(bool Success, string? Token, string? Error)> Register(RegisterDto dto);
    Task<(bool Success, string? Token, string? Error)> Login(LoginDto dto);
}