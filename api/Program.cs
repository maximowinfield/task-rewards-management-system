using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

// CORS: allow dev origins (adjust for production)
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()
));

// EF Core + SQLite
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=app.db"));

var app = builder.Build();

app.UseCors();

// Ensure DB exists + apply migrations + seed kids once
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    if (!db.Kids.Any())
    {
        db.Kids.AddRange(
            new KidProfile { Id = "kid-1", DisplayName = "Kid 1" },
            new KidProfile { Id = "kid-2", DisplayName = "Kid 2" }
        );
        db.SaveChanges();
    }
}

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

// -------------------- Kids --------------------

app.MapGet("/api/kids", async (AppDbContext db) =>
    Results.Ok(await db.Kids.ToListAsync())
);

// -------------------- Tasks --------------------

app.MapGet("/api/tasks", async (AppDbContext db, string? kidId) =>
{
    var q = db.Tasks.AsQueryable();
    if (!string.IsNullOrWhiteSpace(kidId))
        q = q.Where(t => t.AssignedKidId == kidId);

    return Results.Ok(await q.ToListAsync());
});

app.MapPost("/api/tasks", async (AppDbContext db, CreateTaskRequest req) =>
{
    var kidExists = await db.Kids.AnyAsync(k => k.Id == req.AssignedKidId);
    if (!kidExists) return Results.BadRequest("Unknown kidId.");

    var task = new KidTask
    {
        Title = req.Title,
        Points = req.Points,
        AssignedKidId = req.AssignedKidId,
        IsComplete = false,
        CompletedAt = null
    };

    db.Tasks.Add(task);
    await db.SaveChangesAsync();

    return Results.Created($"/api/tasks/{task.Id}", task);
});

app.MapPut("/api/tasks/{id:int}/complete", async (AppDbContext db, int id) =>
{
    var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
    if (task is null) return Results.NotFound();

    if (task.IsComplete) return Results.Ok(task); // no double points

    task.IsComplete = true;
    task.CompletedAt = DateTime.UtcNow;

    await db.SaveChangesAsync();
    return Results.Ok(task);
});

app.MapDelete("/api/tasks/{id:int}", async (AppDbContext db, int id) =>
{
    var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
    if (task is null) return Results.NotFound();

    db.Tasks.Remove(task);
    await db.SaveChangesAsync();

    return Results.NoContent();
});

// Points = completed task points - redeemed reward costs
app.MapGet("/api/points", async (AppDbContext db, string kidId) =>
{
    var kidExists = await db.Kids.AnyAsync(k => k.Id == kidId);
    if (!kidExists) return Results.NotFound("Unknown kidId.");

    var earned = await db.Tasks
        .Where(t => t.AssignedKidId == kidId && t.IsComplete)
        .SumAsync(t => (int?)t.Points) ?? 0;

    var spent = await (from red in db.Redemptions
                       join rw in db.Rewards on red.RewardId equals rw.Id
                       where red.KidId == kidId
                       select (int?)rw.Cost).SumAsync() ?? 0;

    return Results.Ok(new { kidId, points = earned - spent });
});

// -------------------- Rewards + Redemptions --------------------

app.MapGet("/api/rewards", async (AppDbContext db) =>
    Results.Ok(await db.Rewards.ToListAsync())
);

app.MapPost("/api/rewards", async (AppDbContext db, CreateRewardRequest req) =>
{
    var reward = new Reward { Name = req.Name, Cost = req.Cost };
    db.Rewards.Add(reward);
    await db.SaveChangesAsync();

    return Results.Created($"/api/rewards/{reward.Id}", reward);
});

app.MapPost("/api/rewards/{rewardId:int}/redeem", async (AppDbContext db, int rewardId, string kidId) =>
{
    var kidExists = await db.Kids.AnyAsync(k => k.Id == kidId);
    if (!kidExists) return Results.BadRequest("Unknown kidId.");

    var reward = await db.Rewards.FirstOrDefaultAsync(r => r.Id == rewardId);
    if (reward is null) return Results.NotFound("Reward not found.");

    var earned = await db.Tasks
        .Where(t => t.AssignedKidId == kidId && t.IsComplete)
        .SumAsync(t => (int?)t.Points) ?? 0;

    var spent = await (from red in db.Redemptions
                       join rw in db.Rewards on red.RewardId equals rw.Id
                       where red.KidId == kidId
                       select (int?)rw.Cost).SumAsync() ?? 0;

    var currentPoints = earned - spent;
    if (currentPoints < reward.Cost) return Results.BadRequest("Not enough points.");

    var redemption = new Redemption
    {
        KidId = kidId,
        RewardId = rewardId,
        RedeemedAt = DateTime.UtcNow
    };

    db.Redemptions.Add(redemption);
    await db.SaveChangesAsync();

    return Results.Ok(new { kidId, newPoints = currentPoints - reward.Cost, redemption });
});

// -------------------- Todos (NOW PERSISTENT) --------------------

app.MapGet("/api/todos", async (AppDbContext db) =>
    Results.Ok(await db.Todos.OrderBy(t => t.Id).ToListAsync())
);

app.MapPost("/api/todos", async (AppDbContext db, TodoItem todo) =>
{
    todo.Id = 0; // let SQLite autoincrement
    db.Todos.Add(todo);
    await db.SaveChangesAsync();
    return Results.Created($"/api/todos/{todo.Id}", todo);
});

app.MapPut("/api/todos/{id:int}", async (AppDbContext db, int id, TodoItem updated) =>
{
    var todo = await db.Todos.FirstOrDefaultAsync(t => t.Id == id);
    if (todo is null) return Results.NotFound();

    todo.Title = updated.Title;
    todo.IsDone = updated.IsDone;

    await db.SaveChangesAsync();
    return Results.Ok(todo);
});

app.MapDelete("/api/todos/{id:int}", async (AppDbContext db, int id) =>
{
    var todo = await db.Todos.FirstOrDefaultAsync(t => t.Id == id);
    if (todo is null) return Results.NotFound();

    db.Todos.Remove(todo);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run();
