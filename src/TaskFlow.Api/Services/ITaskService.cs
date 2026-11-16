using System.Text.Json;
using TaskFlow.Dtos;

namespace TaskFlow.Services;

public interface ITaskService
{
    Task<PagedResult<TaskResponseDto>> ListAsync(int userId, int? projectId, string? status, int page, int pageSize);
    Task<TaskResponseDto?> GetAsync(int id, int userId);
    Task<TaskResponseDto> CreateAsync(CreateTaskDto dto, int actorId);
    Task<TaskResponseDto?> UpdateAsync(int id, JsonElement patch, int actorId);
    Task<bool> DeleteAsync(int id, int actorId);
    Task<List<TaskResponseDto>?> MoveAsync(int id, MoveTaskDto dto, int actorId);
    Task<TaskResponseDto?> ToggleSubtaskAsync(int taskId, int subtaskId, int actorId);
    Task<CommentResponseDto?> AddCommentAsync(int taskId, string body, int actorId);
}
