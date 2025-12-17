using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<KidProfile> Kids => Set<KidProfile>();
    public DbSet<KidTask> Tasks => Set<KidTask>();
    public DbSet<Reward> Rewards => Set<Reward>();
    public DbSet<Redemption> Redemptions => Set<Redemption>();

    public DbSet<TodoItem> Todos => Set<TodoItem>();
}

// Entities (EF Core works best with classes)
public class KidProfile
{
    public string Id { get; set; } = "";
    public string DisplayName { get; set; } = "";
}

public class KidTask
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public int Points { get; set; }
    public string AssignedKidId { get; set; } = "";
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

// ✅ Persisted Todo model (so /api/todos persists too)
public class TodoItem
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public bool IsDone { get; set; }
}

// Request DTOs (fine as records)
public record CreateTaskRequest(string Title, int Points, string AssignedKidId);
public record CreateRewardRequest(string Name, int Cost);
