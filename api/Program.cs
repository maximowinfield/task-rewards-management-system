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

// ✅ Type declarations MUST be before top-level statements (fixes CS8803)

var builder = WebApplication.CreateBuilder(args);

// ✅ CORS Policy: allow dev + deployed origins
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:5000",
                "https://maximowinfield.github.io",
                "https://microsoft-fullstack-sample.onrender.com"
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
            ClockSkew = TimeSpan.FromMinutes(1),

            // Role policy reads ClaimTypes.Role
            RoleClaimType = ClaimTypes.Role,

            // NameIdentifier mapping can vary; we'll set it explicitly
            NameClaimType = ClaimTypes.NameIdentifier
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ParentOnly", policy => policy.RequireRole("Parent"));
    options.AddPolicy("KidOnly", policy => policy.RequireRole("Kid"));
});

var app = builder.Build();
app.MapGet("/__version", () => Results.Text("CORS-GROUP-V1")).AllowAnonymous();

// -------------------- ✅ SPA Static Files (single-domain hosting) --------------------
app.UseDefaultFiles();   // serves index.html by default if present
app.UseStaticFiles();    // serves /assets/* etc from wwwroot
// -----------------------------------------------------------------------------

// Routing + Middleware order matters
app.UseRouting();

// CORS must be before auth so headers get added (mainly needed for localhost Vite dev)
app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

// All /api routes MUST go through this group to inherit CORS reliably
var api = app.MapGroup("/api")
             .RequireCors("Frontend");

// Preflight handler for anything under /api/*
api.MapMethods("/{*path}", new[] { "OPTIONS" }, () => Results.Ok())
   .AllowAnonymous();

// Helper: reliably read the authenticated user id (Parent or Kid)
static string? GetUserId(ClaimsPrincipal principal)
{
    return principal.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
}

// Helper: create JWT tokens
string CreateToken(string subjectId, string role, string? kidId = null, string? parentId = null)
{
    var claims = new List<Claim>
    {
        new Claim(JwtRegisteredClaimNames.Sub, subjectId),
        new Claim(ClaimTypes.NameIdentifier, subjectId),
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

api.MapPost("/kid-session", async (ClaimsPrincipal principal, AppDbContext db, KidSessionRequest req) =>
{
    var parentId = GetUserId(principal);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    var kid = await db.Kids.FirstOrDefaultAsync(k => k.Id == req.KidId && k.ParentId == parentId);
    if (kid is null) return Results.NotFound("Kid not found for this parent.");

    var kidToken = CreateToken(subjectId: kid.Id, role: "Kid", kidId: kid.Id, parentId: parentId);
    return Results.Ok(new { token = kidToken, role = "Kid", kidId = kid.Id, displayName = kid.DisplayName });
})
.RequireAuthorization("ParentOnly");

// -------------------- Kids --------------------
api.MapGet("/kids", async (ClaimsPrincipal principal, AppDbContext db) =>
{
    var parentId = GetUserId(principal);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    var kids = await db.Kids.Where(k => k.ParentId == parentId).ToListAsync();
    return Results.Ok(kids);
})
.RequireAuthorization("ParentOnly");

api.MapPost("/kids", async (ClaimsPrincipal principal, AppDbContext db, CreateKidRequest req) =>
{
    var parentId = GetUserId(principal);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    var name = (req.DisplayName ?? "").Trim();
    if (string.IsNullOrWhiteSpace(name)) return Results.BadRequest("DisplayName is required.");

    var kid = new KidProfile
    {
        Id = Guid.NewGuid().ToString(),
        ParentId = parentId,
        DisplayName = name
    };

    db.Kids.Add(kid);
    await db.SaveChangesAsync();

    return Results.Created($"/api/kids/{kid.Id}", kid);
})
.RequireAuthorization("ParentOnly");

api.MapPut("/kids/{kidId}", async (ClaimsPrincipal principal, AppDbContext db, string kidId, UpdateKidRequest req) =>
{
    var parentId = GetUserId(principal);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    var name = (req.DisplayName ?? "").Trim();
    if (string.IsNullOrWhiteSpace(name)) return Results.BadRequest("DisplayName is required.");

    var kid = await db.Kids.FirstOrDefaultAsync(k => k.Id == kidId && k.ParentId == parentId);
    if (kid is null) return Results.NotFound("Kid not found for this parent.");

    kid.DisplayName = name;
    await db.SaveChangesAsync();

    return Results.Ok(kid);
})
.RequireAuthorization("ParentOnly");

// -------------------- Tasks --------------------
api.MapGet("/tasks", async (ClaimsPrincipal principal, AppDbContext db, string? kidId) =>
{
    var role = principal.FindFirstValue(ClaimTypes.Role);

    if (role == "Kid")
    {
        var kidClaim = principal.FindFirstValue("kidId") ?? GetUserId(principal);
        if (string.IsNullOrWhiteSpace(kidClaim)) return Results.Unauthorized();

        var tasks = await db.Tasks.Where(t => t.AssignedKidId == kidClaim).ToListAsync();
        return Results.Ok(tasks);
    }

    var parentId = GetUserId(principal);
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
.RequireAuthorization();

api.MapPost("/tasks", async (ClaimsPrincipal principal, AppDbContext db, CreateTaskRequest req) =>
{
    var parentId = GetUserId(principal);
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

api.MapPut("/tasks/{id:int}/complete", async (ClaimsPrincipal principal, AppDbContext db, int id) =>
{
    var kidId = principal.FindFirstValue("kidId") ?? GetUserId(principal);
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

api.MapDelete("/tasks/{id:int}", async (ClaimsPrincipal principal, AppDbContext db, int id) =>
{
    var parentId = GetUserId(principal);
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
        effectiveKidId = principal.FindFirstValue("kidId") ?? GetUserId(principal) ?? "";
        if (string.IsNullOrWhiteSpace(effectiveKidId)) return Results.Unauthorized();
    }
    else
    {
        var parentId = GetUserId(principal);
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
.RequireAuthorization();

// -------------------- Rewards + Redemptions --------------------
api.MapGet("/rewards", async (AppDbContext db) =>
    Results.Ok(await db.Rewards.ToListAsync())
)
.RequireAuthorization();

api.MapPost("/rewards", async (AppDbContext db, CreateRewardRequest req) =>
{
    var reward = new Reward { Name = req.Name, Cost = req.Cost };
    db.Rewards.Add(reward);
    await db.SaveChangesAsync();

    return Results.Created($"/api/rewards/{reward.Id}", reward);
})
.RequireAuthorization("ParentOnly");

api.MapPost("/rewards/{rewardId:int}/redeem", async (ClaimsPrincipal principal, AppDbContext db, int rewardId) =>
{
    var kidId = principal.FindFirstValue("kidId") ?? GetUserId(principal);
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
api.MapGet("/todos", async (AppDbContext db) =>
    Results.Ok(await db.Todos.OrderBy(t => t.Id).ToListAsync())
)
.RequireAuthorization();

api.MapPost("/todos", async (AppDbContext db, TodoItem todo) =>
{
    todo.Id = 0;
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

// -------------------- ✅ SPA fallback (deep links) --------------------
app.MapFallbackToFile("index.html");

app.Run();
