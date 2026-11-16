using TaskFlow.Dtos;

namespace TaskFlow.Services;

public interface IActivityService
{
    Task<PagedResult<ActivityResponseDto>> ListAsync(int userId, int page, int pageSize);
}
