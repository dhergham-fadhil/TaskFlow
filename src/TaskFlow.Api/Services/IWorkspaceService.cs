using TaskFlow.Dtos;

namespace TaskFlow.Services;

public interface IWorkspaceService
{
    Task<WorkspaceResponseDto> GetWorkspaceAsync(int userId);
}
