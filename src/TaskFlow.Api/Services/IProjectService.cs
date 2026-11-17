using TaskFlow.Dtos;

namespace TaskFlow.Services;

public interface IProjectService
{
    Task<PagedResult<ProjectResponseDto>> ListAsync(int userId, int page, int pageSize);
    Task<ProjectResponseDto?> GetAsync(int id, int userId);
    Task<ProjectResponseDto> CreateAsync(CreateProjectDto dto, int ownerId);
    Task<ProjectResponseDto?> UpdateAsync(int id, UpdateProjectDto patch, int userId);
    Task<ProjectResponseDto?> SetStatusAsync(int id, string status, int userId);
    Task<bool> DeleteAsync(int id, int userId);
    Task<bool> AddMemberAsync(int projectId, int memberId, int userId);
    Task<bool> RemoveMemberAsync(int projectId, int memberId, int userId);
}
