using Microsoft.EntityFrameworkCore;

// ============================================================
// AppDbContext (Entity Framework Core)
// - This is the "database gateway" for the app.
// - It defines which tables exist (DbSet<>) and how relationships behave.
// - EF Core uses this class to build migrations + run queries.
// ============================================================

public class AppDbContext : DbContext
{
    // ------------------------------------------------------------
    // Constructor
    // - DbContextOptions contains the configured provider + connection string
    // - Program.cs registers this with UseSqlite(...)
    // ------------------------------------------------------------
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // ------------------------------------------------------------
    // DbSets = Tables (or collections) EF Core tracks
    // - Each DbSet<T> becomes a table by default (with conventions)
    // - Endpoints can query like: db.Kids.Where(...), db.Tasks.Add(...), etc.
    // ------------------------------------------------------------

    public DbSet<KidProfile> Kids => Set<KidProfile>();
    public DbSet<KidTask> Tasks => Set<KidTask>();
    public DbSet<Reward> Rewards => Set<Reward>();
    public DbSet<Redemption> Redemptions => Set<Redemption>();
    public DbSet<TodoItem> Todos => Set<TodoItem>();
    public DbSet<AppUser> Users => Set<AppUser>();

    // Ledger table: records every points earn/spend event
    public DbSet<PointTransaction> PointTransactions => Set<PointTransaction>();

    // ------------------------------------------------------------
    // OnModelCreating
    // - This is where we override EF Core "conventions" when needed.
    // - Use it to configure keys, relationships, delete behavior, indexes, etc.
    // ------------------------------------------------------------
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ============================================================
        // PointTransaction (Points Ledger)
        // - Purpose: provide an immutable-ish history of points changes.
        //   Example:
        //     - Earn: "Completed task: Brush Teeth" +50
        //     - Spend: "Redeemed reward: Ice Cream" -100
        //
        // Why a ledger?
        // - Your current balance (KidProfile.PointsBalance) is fast to read.
        // - The ledger (PointTransactions) is your audit trail / history view.
        // ============================================================

        modelBuilder.Entity<PointTransaction>(entity =>
        {
            // -----------------------------
            // Primary Key
            // -----------------------------
            entity.HasKey(x => x.Id);

            // -----------------------------
            // Required fields
            // - Every transaction must belong to a kid
            // -----------------------------
            entity.Property(x => x.KidId).IsRequired();

            // -----------------------------
            // Relationship: PointTransaction -> KidProfile (required)
            // - A Kid can have many transactions (history entries)
            // - Cascade delete means:
            //   If a KidProfile is deleted, their transaction history is deleted too
            // -----------------------------
            entity.HasOne(x => x.Kid)
                  .WithMany() // No navigation collection on KidProfile right now (could be WithMany(k => k.PointTransactions) later)
                  .HasForeignKey(x => x.KidId)
                  .OnDelete(DeleteBehavior.Cascade);

            // -----------------------------
            // Optional Relationship: PointTransaction -> KidTask
            // - Some transactions are tied to completing a task
            // - DeleteBehavior.SetNull means:
            //   If a task is deleted later, we keep the transaction history,
            //   and just set TaskId to null so the ledger remains valid.
            // -----------------------------
            entity.HasOne(x => x.Task)
                  .WithMany()
                  .HasForeignKey(x => x.TaskId)
                  .OnDelete(DeleteBehavior.SetNull);

            // -----------------------------
            // Optional Relationship: PointTransaction -> Redemption
            // - Some transactions are tied to redeeming a reward
            // - SetNull preserves the ledger if a redemption is deleted
            // -----------------------------
            entity.HasOne(x => x.Redemption)
                  .WithMany()
                  .HasForeignKey(x => x.RedemptionId)
                  .OnDelete(DeleteBehavior.SetNull);

            // -----------------------------
            // Indexes (performance)
            // - KidId index speeds up "show history for this kid"
            // - (KidId, CreatedAtUtc) speeds up sorting/filtering by time per kid
            // -----------------------------
            entity.HasIndex(x => x.KidId);
            entity.HasIndex(x => new { x.KidId, x.CreatedAtUtc });
        });

        // ------------------------------------------------------------
        // NOTE:
        // The rest of my models rely on EF Core conventions:
        // - Id fields become primary keys
        // - *Id fields become foreign keys when nav properties exist
        // - Strings become TEXT (SQLite), ints become INTEGER, etc.
        //
        // You only needed explicit mapping here for the ledger rules.
        // ------------------------------------------------------------
    }
}
