using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<KidProfile> Kids => Set<KidProfile>();
    public DbSet<KidTask> Tasks => Set<KidTask>();
    public DbSet<Reward> Rewards => Set<Reward>();
    public DbSet<Redemption> Redemptions => Set<Redemption>();

    public DbSet<TodoItem> Todos => Set<TodoItem>();
    public DbSet<AppUser> Users => Set<AppUser>();

}

// Entities (EF Core works best with classes)
public class AppUser
{
    public string Id { get; set; } = "";           // Guid string is easiest
    public string Username { get; set; } = "";     // Parent email OR kid username
    public string PasswordHash { get; set; } = ""; // hashed password or PIN hash
    public string Role { get; set; } = "Kid";      // "Parent" or "Kid"
    public string? ParentId { get; set; }          // null for Parent, set for Kid
}

public class KidProfile
{
    public string Id { get; set; } = "";
    public string ParentId { get; set; } = "";     // NEW
    public string DisplayName { get; set; } = "";
}


public class KidTask
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public int Points { get; set; }
    public string AssignedKidId { get; set; } = "";
    public string CreatedByParentId { get; set; } = ""; // NEW

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


