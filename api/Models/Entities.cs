public class AppUser
{
    public string Id { get; set; } = "";
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "Kid";
    public string? ParentId { get; set; }
}

public class KidProfile
{
    public string Id { get; set; } = "";
    public string ParentId { get; set; } = "";
    public string DisplayName { get; set; } = "";

    // next step:
    public int PointsBalance { get; set; } = 0;
}

public class KidTask
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public int Points { get; set; }
    public string AssignedKidId { get; set; } = "";
    public string CreatedByParentId { get; set; } = "";
    public bool IsComplete { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class Reward
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int Cost { get; set; }
}

public class Redemption
{
    public int Id { get; set; }
    public string KidId { get; set; } = "";
    public int RewardId { get; set; }
    public DateTime RedeemedAt { get; set; }
}

public class TodoItem
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public bool IsDone { get; set; }
}

public enum PointTransactionType
{
    Earn = 1,
    Spend = 2,
    Adjust = 3
}

public class PointTransaction
{
    public int Id { get; set; }

    public string KidId { get; set; } = "";
    public KidProfile? Kid { get; set; }

    public PointTransactionType Type { get; set; }

    // Positive for Earn/Adjust+, negative for Spend/Adjust-
    public int Delta { get; set; }

    // Optional: link to what caused it
    public int? TaskId { get; set; }
    public KidTask? Task { get; set; }

    public int? RedemptionId { get; set; }
    public Redemption? Redemption { get; set; }

    public string Note { get; set; } = "";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
