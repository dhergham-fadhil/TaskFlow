namespace TaskFlow.Models;

/// <summary>
/// Refresh token for JWT rotation. Stored hashed; only the plaintext token is
/// returned to the client once at issuance time.
/// </summary>
public class RefreshToken
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>
    /// SHA-256 hash of the plaintext refresh token.
    /// </summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// When the token was revoked; null means active.
    /// </summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>
    /// Token that replaced this one (rotation chain). Null for the latest active token.
    /// </summary>
    public string? ReplacedByToken { get; set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsActive => RevokedAt is null && !IsExpired;
}
