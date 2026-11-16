using TaskFlow.Dtos;

namespace TaskFlow.Services;

public interface IUserService
{
    Task<UserResponseDto?> GetProfileAsync(int userId);
    Task<UserResponseDto?> UpdateProfileAsync(int userId, System.Text.Json.JsonElement patch);
}
