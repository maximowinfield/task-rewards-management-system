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
    public DbSet<PointTransaction> PointTransactions => Set<PointTransaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // -------------------------------------------------
        // PointTransaction (ledger)
        // -------------------------------------------------
        modelBuilder.Entity<PointTransaction>(entity =>
        {
            entity.HasKey(x => x.Id);

            // Every transaction belongs to a kid
            entity.Property(x => x.KidId).IsRequired();

            entity.HasOne(x => x.Kid)
                  .WithMany() // optional nav collection later
                  .HasForeignKey(x => x.KidId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Optional link to task (keep history if task is deleted)
            entity.HasOne(x => x.Task)
                  .WithMany()
                  .HasForeignKey(x => x.TaskId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Optional link to redemption (keep history if redemption is deleted)
            entity.HasOne(x => x.Redemption)
                  .WithMany()
                  .HasForeignKey(x => x.RedemptionId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Useful indexes
            entity.HasIndex(x => x.KidId);
            entity.HasIndex(x => new { x.KidId, x.CreatedAtUtc });
        });
    }
}
