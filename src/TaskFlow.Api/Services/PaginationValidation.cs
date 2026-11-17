using TaskFlow.Services;

namespace TaskFlow.Dtos;

/// <summary>
/// Validates pagination parameters before data access. Keeps validation logic
/// consistent across TaskService and ProjectService.
/// </summary>
public static class PaginationValidation
{
    private const int MaxPageSize = 100;

    public static void Validate(int page, int pageSize)
    {
        if (page < 1)
            throw new ValidationException($"Page must be greater than or equal to 1. (got {page})");
        if (pageSize < 1)
            throw new ValidationException($"PageSize must be greater than or equal to 1. (got {pageSize})");
        if (pageSize > MaxPageSize)
            throw new ValidationException($"PageSize must not exceed {MaxPageSize}. (got {pageSize})");
    }
}