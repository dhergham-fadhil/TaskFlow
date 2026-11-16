namespace TaskFlow.Services;

/// <summary>
/// Thrown when request data fails validation (HTTP 400).
/// </summary>
public sealed class ValidationException(string message) : Exception(message);

/// <summary>
/// Thrown when an authenticated user lacks permission (HTTP 403).
/// </summary>
public sealed class ForbiddenException(string message) : Exception(message);
