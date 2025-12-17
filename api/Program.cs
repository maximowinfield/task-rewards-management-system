using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

var builder = WebApplication.CreateBuilder(args);

// CORS Policy: allow dev origins (adjust for production)
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(
                "http://localhost:5173",
                "https://maximowinfield.github.io"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
    );
});

// EF Core + SQLite
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=app.db"));

// Password hashing (lightweight, no full Identity stack)
builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();

// JWT Auth (Option B: Parent login + Kid session token)
var jwtSecret =
    builder.Configuration["JWT_SECRET"]
    ?? "dev-only-secret-change-me-32chars-minimum!!"; // 32+ chars

var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = jwtKey,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ParentOnly", policy => policy.RequireRole("Parent"));
    options.AddPolicy("KidOnly", policy => policy.RequireRole("Kid"));
});

var app = builder.Build();
app.MapGet("/__version", () => Results.Text("CORS-GROUP-V1")).AllowAnonymous();


// Routing + Middleware order matters
app.UseRouting();

// CORS must be before auth so headers get added
app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

// All /api routes MUST go through this group to inherit CORS reliably
var api = app.MapGroup("/api")
             .RequireCors("Frontend");

// Preflight handler for anything under /api/*
api.MapMethods("/{*path}", new[] { "OPTIONS" }, () => Results.Ok())
   .AllowAnonymous();


// Helper: create JWT tokens
string CreateToken(string subjectId, string role, string? kidId = null, string? parentId = null)
{
    var claims = new List<Claim>
    {
        new Claim(JwtRegisteredClaimNames.Sub, subjectId),
        new Claim(ClaimTypes.Role, role),
    };

    if (!string.IsNullOrWhiteSpace(kidId))
        claims.Add(new Claim("kidId", kidId));

    if (!string.IsNullOrWhiteSpace(parentId))
        claims.Add(new Claim("parentId", parentId));

    var creds = new SigningCredentials(jwtKey, SecurityAlgorithms.HmacSha256);
    var token = new JwtSecurityToken(
        claims: claims,
        expires: DateTime.UtcNow.AddHours(8),
        signingCredentials: creds
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
}

// Ensure DB exists + apply migrations + seed parents/kids once
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();

    // Seed default parents
    try
    {
        var databaseCreator = db.Database.GetService<IRelationalDatabaseCreator>();

        if (databaseCreator.HasTables())
        {
            if (!db.Users.Any(u => u.Role == "Parent"))
            {
                var p1 = new AppUser
                {
                    Id = Guid.NewGuid().ToString(),
                    Username = "parent1",
                    Role = "Parent"
                };
                p1.PasswordHash = hasher.HashPassword(p1, "ChangeMe123!");

                var p2 = new AppUser
                {
                    Id = Guid.NewGuid().ToString(),
                    Username = "parent2",
                    Role = "Parent"
                };
                p2.PasswordHash = hasher.HashPassword(p2, "ChangeMe123!");

                db.Users.AddRange(p1, p2);
                db.SaveChanges();
            }
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"User seed skipped: {ex.Message}");
    }

    var firstParentId = db.Users.Where(u => u.Role == "Parent").Select(u => u.Id).FirstOrDefault();
    if (string.IsNullOrWhiteSpace(firstParentId))
    {
        Console.WriteLine("No parent users found; skipping kid seed.");
    }
    else if (!db.Kids.Any())
    {
        db.Kids.AddRange(
            new KidProfile { Id = "kid-1", ParentId = firstParentId, DisplayName = "Kid 1" },
            new KidProfile { Id = "kid-2", ParentId = firstParentId, DisplayName = "Kid 2" }
        );
        db.SaveChanges();
    }
}

// Health
api.MapGet("/health", () => Results.Ok(new { status = "ok" }))
   .RequireCors("Frontend")
   .AllowAnonymous();


// -------------------- Auth (Option B) --------------------

// Parent login: returns Parent token
api.MapPost("/parent/login", async (AppDbContext db, IPasswordHasher<AppUser> hasher, ParentLoginRequest req) =>
{
    var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Username && u.Role == "Parent");
    if (user is null) return Results.Unauthorized();

    var verified = hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
    if (verified == PasswordVerificationResult.Failed) return Results.Unauthorized();

    var token = CreateToken(subjectId: user.Id, role: "Parent");
    return Results.Ok(new { token, role = "Parent" });
})
.RequireCors("Frontend")
.AllowAnonymous();


// Parent enters Kid Mode: returns Kid token scoped to a kid profile
api.MapPost("/kid-session", async (ClaimsPrincipal principal, AppDbContext db, KidSessionRequest req) =>
{
    var parentId = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    var kid = await db.Kids.FirstOrDefaultAsync(k => k.Id == req.KidId && k.ParentId == parentId);
    if (kid is null) return Results.NotFound("Kid not found for this parent.");

    var kidToken = CreateToken(subjectId: kid.Id, role: "Kid", kidId: kid.Id, parentId: parentId);
    return Results.Ok(new { token = kidToken, role = "Kid", kidId = kid.Id, displayName = kid.DisplayName });
})
.RequireAuthorization("ParentOnly");

// -------------------- Kids --------------------

// Parent sees only their kids
api.MapGet("/kids", async (ClaimsPrincipal principal, AppDbContext db) =>
{
    var parentId = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    var kids = await db.Kids.Where(k => k.ParentId == parentId).ToListAsync();
    return Results.Ok(kids);
})
.RequireAuthorization("ParentOnly");

// -------------------- Tasks --------------------

// Parent can view tasks (optionally filter by kidId, but only if kid belongs to parent)
// Kid can view only their tasks
api.MapGet("/tasks", async (ClaimsPrincipal principal, AppDbContext db, string? kidId) =>
{
    var role = principal.FindFirstValue(ClaimTypes.Role);

    if (role == "Kid")
    {
        var kidClaim = principal.FindFirstValue("kidId") ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (string.IsNullOrWhiteSpace(kidClaim)) return Results.Unauthorized();

        var tasks = await db.Tasks.Where(t => t.AssignedKidId == kidClaim).ToListAsync();
        return Results.Ok(tasks);
    }

    var parentId = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    var q = db.Tasks.AsQueryable();

    if (!string.IsNullOrWhiteSpace(kidId))
    {
        var kidOwned = await db.Kids.AnyAsync(k => k.Id == kidId && k.ParentId == parentId);
        if (!kidOwned) return Results.BadRequest("Unknown kidId for this parent.");
        q = q.Where(t => t.AssignedKidId == kidId);
    }
    else
    {
        q = q.Where(t => t.CreatedByParentId == parentId);
    }

    return Results.Ok(await q.ToListAsync());
})
.RequireAuthorization(); // Parent or Kid

// Parent creates tasks; server sets CreatedByParentId
api.MapPost("/tasks", async (ClaimsPrincipal principal, AppDbContext db, CreateTaskRequest req) =>
{
    var parentId = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    var kidExists = await db.Kids.AnyAsync(k => k.Id == req.AssignedKidId && k.ParentId == parentId);
    if (!kidExists) return Results.BadRequest("Unknown kidId for this parent.");

    var task = new KidTask
    {
        Title = req.Title,
        Points = req.Points,
        AssignedKidId = req.AssignedKidId,
        CreatedByParentId = parentId,
        IsComplete = false,
        CompletedAt = null
    };

    db.Tasks.Add(task);
    await db.SaveChangesAsync();

    return Results.Created($"/api/tasks/{task.Id}", task);
})
.RequireAuthorization("ParentOnly");

// Kid completes tasks
api.MapPut("/tasks/{id:int}/complete", async (ClaimsPrincipal principal, AppDbContext db, int id) =>
{
    var kidId = principal.FindFirstValue("kidId") ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (string.IsNullOrWhiteSpace(kidId)) return Results.Unauthorized();

    var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.AssignedKidId == kidId);
    if (task is null) return Results.NotFound();

    if (task.IsComplete) return Results.Ok(task);

    task.IsComplete = true;
    task.CompletedAt = DateTime.UtcNow;

    await db.SaveChangesAsync();
    return Results.Ok(task);
})
.RequireAuthorization("KidOnly");

// Parent deletes tasks they created
api.MapDelete("/tasks/{id:int}", async (ClaimsPrincipal principal, AppDbContext db, int id) =>
{
    var parentId = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.CreatedByParentId == parentId);
    if (task is null) return Results.NotFound();

    db.Tasks.Remove(task);
    await db.SaveChangesAsync();

    return Results.NoContent();
})
.RequireAuthorization("ParentOnly");

// -------------------- Points --------------------

api.MapGet("/points", async (ClaimsPrincipal principal, AppDbContext db, string? kidId) =>
{
    var role = principal.FindFirstValue(ClaimTypes.Role);

    string effectiveKidId;
    if (role == "Kid")
    {
        effectiveKidId = principal.FindFirstValue("kidId") ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? "";
        if (string.IsNullOrWhiteSpace(effectiveKidId)) return Results.Unauthorized();
    }
    else
    {
        var parentId = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

        if (string.IsNullOrWhiteSpace(kidId)) return Results.BadRequest("kidId is required for parent.");
        var kidOwned = await db.Kids.AnyAsync(k => k.Id == kidId && k.ParentId == parentId);
        if (!kidOwned) return Results.BadRequest("Unknown kidId for this parent.");

        effectiveKidId = kidId;
    }

    var earned = await db.Tasks
        .Where(t => t.AssignedKidId == effectiveKidId && t.IsComplete)
        .SumAsync(t => (int?)t.Points) ?? 0;

    var spent = await (from red in db.Redemptions
                       join rw in db.Rewards on red.RewardId equals rw.Id
                       where red.KidId == effectiveKidId
                       select (int?)rw.Cost).SumAsync() ?? 0;

    return Results.Ok(new { kidId = effectiveKidId, points = earned - spent });
})
.RequireAuthorization(); // Parent or Kid

// -------------------- Rewards + Redemptions --------------------

// Everyone can view rewards
api.MapGet("/rewards", async (AppDbContext db) =>
    Results.Ok(await db.Rewards.ToListAsync())
)
.RequireAuthorization(); // Parent or Kid (if you want public, change to .AllowAnonymous())

// Parent creates rewards
api.MapPost("/rewards", async (AppDbContext db, CreateRewardRequest req) =>
{
    var reward = new Reward { Name = req.Name, Cost = req.Cost };
    db.Rewards.Add(reward);
    await db.SaveChangesAsync();

    return Results.Created($"/api/rewards/{reward.Id}", reward);
})
.RequireAuthorization("ParentOnly");

// Kid redeems a reward
api.MapPost("/rewards/{rewardId:int}/redeem", async (ClaimsPrincipal principal, AppDbContext db, int rewardId) =>
{
    var kidId = principal.FindFirstValue("kidId") ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (string.IsNullOrWhiteSpace(kidId)) return Results.Unauthorized();

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
})
.RequireAuthorization("KidOnly");

// -------------------- Todos --------------------

// Everyone can view todos (you can lock later if desired)
api.MapGet("/todos", async (AppDbContext db) =>
    Results.Ok(await db.Todos.OrderBy(t => t.Id).ToListAsync())
)
.RequireAuthorization(); // Parent or Kid (or change to .AllowAnonymous())

api.MapPost("/todos", async (AppDbContext db, TodoItem todo) =>
{
    todo.Id = 0; // let SQLite autoincrement
    db.Todos.Add(todo);
    await db.SaveChangesAsync();
    return Results.Created($"/api/todos/{todo.Id}", todo);
});

api.MapPut("/todos/{id:int}", async (AppDbContext db, int id, TodoItem updated) =>
{
    var todo = await db.Todos.FirstOrDefaultAsync(t => t.Id == id);
    if (todo is null) return Results.NotFound();

    todo.Title = updated.Title;
    todo.IsDone = updated.IsDone;

    await db.SaveChangesAsync();
    return Results.Ok(todo);
});

api.MapDelete("/todos/{id:int}", async (AppDbContext db, int id) =>
{
    var todo = await db.Todos.FirstOrDefaultAsync(t => t.Id == id);
    if (todo is null) return Results.NotFound();

    db.Todos.Remove(todo);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run();
