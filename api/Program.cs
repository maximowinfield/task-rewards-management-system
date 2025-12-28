using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.IO;

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

// ✅ EF Core + SQLite (Render persistent disk via DB_PATH)
var dbPath = Environment.GetEnvironmentVariable("DB_PATH") ?? "app.db";

// If DB_PATH includes a directory (Render: /var/data/app.db), ensure it exists
var dbDir = Path.GetDirectoryName(dbPath);
if (!string.IsNullOrWhiteSpace(dbDir))
{
    Directory.CreateDirectory(dbDir);
}

Console.WriteLine($"[DB] Using SQLite at: {dbPath}");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// Password hashing (lightweight, no full Identity stack)
builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();

// JWT Auth
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
            RoleClaimType = ClaimTypes.Role,
            NameClaimType = ClaimTypes.NameIdentifier
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ParentOnly", policy => policy.RequireRole("Parent"));
    options.AddPolicy("KidOnly", policy => policy.RequireRole("Kid"));
    // ✅ ADD THIS shared policy
    options.AddPolicy("KidOrParent", policy =>
        policy.RequireRole("Kid", "Parent"));
});

var app = builder.Build();

app.MapGet("/__version", () => Results.Text("CORS-GROUP-V1")).AllowAnonymous();

// -------------------- ✅ SPA Static Files --------------------
app.UseDefaultFiles();
app.UseStaticFiles();
// ------------------------------------------------------------

// Routing + Middleware order matters
app.UseRouting();

// CORS must be before auth so headers get added
app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

// All /api routes go through this group
var api = app.MapGroup("/api").RequireCors("Frontend");

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

// -------------------- ✅ Database migrate + seed (safe) --------------------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();

    // Ensure default parent exists
    var parent = db.Users.FirstOrDefault(u => u.Username == "parent1" && u.Role == "Parent");
    if (parent == null)
    {
        parent = new AppUser
        {
            Id = Guid.NewGuid().ToString(),
            Username = "parent1",
            Role = "Parent"
        };
        parent.PasswordHash = hasher.HashPassword(parent, "ChangeMe123");
        db.Users.Add(parent);
        db.SaveChanges();
    }

    var parentId = parent.Id;

    // Ensure default kids exist for that parent (kid-1 / kid-2)
    if (!db.Kids.Any(k => k.ParentId == parentId))
    {
        db.Kids.AddRange(
            new KidProfile { Id = "kid-1", ParentId = parentId, DisplayName = "Kid 1" },
            new KidProfile { Id = "kid-2", ParentId = parentId, DisplayName = "Kid 2" }
        );
        db.SaveChanges();
    }

    // Seed default rewards if none exist
    if (!db.Rewards.Any())
    {
        db.Rewards.AddRange(
            new Reward { Name = "Ice Cream", Cost = 100 },
            new Reward { Name = "Extra Screen Time", Cost = 50 },
            new Reward { Name = "Movie Night", Cost = 150 }
        );
        db.SaveChanges();
    }

    // Seed default tasks if none exist (avoid duplicating)
    if (!db.Tasks.Any())
    {
        db.Tasks.AddRange(
            new KidTask
            {
                Title = "Brush Teeth",
                Points = 50,
                AssignedKidId = "kid-1",
                CreatedByParentId = parentId,
                IsComplete = false,
                CompletedAt = null
            },
            new KidTask
            {
                Title = "Go to School",
                Points = 50,
                AssignedKidId = "kid-1",
                CreatedByParentId = parentId,
                IsComplete = false,
                CompletedAt = null
            },
            new KidTask
            {
                Title = "Homework",
                Points = 50,
                AssignedKidId = "kid-2",
                CreatedByParentId = parentId,
                IsComplete = false,
                CompletedAt = null
            }
        );
        db.SaveChanges();
    }
}
// -------------------------------------------------------------------------------

// Health
api.MapGet("/health", () => Results.Ok(new { status = "ok" }))
   .AllowAnonymous();

// -------------------- Auth --------------------

api.MapPost("/parent/login", async (AppDbContext db, IPasswordHasher<AppUser> hasher, ParentLoginRequest req) =>
{
    var username = (req.Username ?? "").Trim();
    var password = req.Password ?? "";

    if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        return Results.Unauthorized();

    // ✅ Case-insensitive username match + parent role
    var user = await db.Users.FirstOrDefaultAsync(u =>
        u.Role == "Parent" &&
        u.Username.ToLower() == username.ToLower()
    );

    if (user is null) return Results.Unauthorized();

    var verified = hasher.VerifyHashedPassword(user, user.PasswordHash, password);
    if (verified == PasswordVerificationResult.Failed) return Results.Unauthorized();

    var token = CreateToken(subjectId: user.Id, role: "Parent");
    return Results.Ok(new { token, role = "Parent" });
})
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
    try
    {
        var parentId = GetUserId(principal);
        if (string.IsNullOrWhiteSpace(parentId))
            return Results.Unauthorized();

        // ✅ DEBUG: confirm DB has kids + parent filter works
        Console.WriteLine($"[GET /api/kids] parentId={parentId}");
        Console.WriteLine($"[GET /api/kids] totalKids={await db.Kids.CountAsync()}");
        Console.WriteLine($"[GET /api/kids] kidsForParent={await db.Kids.CountAsync(k => k.ParentId == parentId)}");

        var kids = await db.Kids
            .Where(k => k.ParentId == parentId)
            .OrderBy(k => k.DisplayName)
            .ToListAsync();

        return Results.Ok(kids);
    }
    catch (Exception ex)
    {
        Console.WriteLine("❌ /api/kids failed:");
        Console.WriteLine(ex.ToString());
        return Results.Problem(ex.Message);
    }
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

// ✅ Parent edits a task (title/points/assigned kid)
api.MapPut("/tasks/{id:int}", async (ClaimsPrincipal principal, AppDbContext db, int id, UpdateTaskRequest req) =>
{
    var parentId = GetUserId(principal);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.CreatedByParentId == parentId);
    if (task is null) return Results.NotFound("Task not found.");

    // Title
    if (req.Title is not null)
    {
        var title = req.Title.Trim();
        if (string.IsNullOrWhiteSpace(title)) return Results.BadRequest("Title cannot be empty.");
        task.Title = title;
    }

    // Points
    if (req.Points is not null)
    {
        if (req.Points.Value < 0) return Results.BadRequest("Points must be >= 0.");
        task.Points = req.Points.Value;
    }

    // Reassign kid (must belong to same parent)
    if (req.AssignedKidId is not null)
    {
        var newKidId = req.AssignedKidId.Trim();
        if (string.IsNullOrWhiteSpace(newKidId)) return Results.BadRequest("AssignedKidId cannot be empty.");

        var kidOwned = await db.Kids.AnyAsync(k => k.Id == newKidId && k.ParentId == parentId);
        if (!kidOwned) return Results.BadRequest("Unknown kidId for this parent.");

        task.AssignedKidId = newKidId;
    }

    await db.SaveChangesAsync();
    return Results.Ok(task);
})
.RequireAuthorization("ParentOnly");

api.MapPut("/tasks/{id:int}/complete", async (ClaimsPrincipal principal, AppDbContext db, int id, string? kidId) =>
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
        // Parent completing on behalf of a kid
        var parentId = GetUserId(principal);
        if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();
        if (string.IsNullOrWhiteSpace(kidId)) return Results.BadRequest("kidId is required for parent.");

        var kidOwned = await db.Kids.AnyAsync(k => k.Id == kidId && k.ParentId == parentId);
        if (!kidOwned) return Results.BadRequest("Unknown kidId for this parent.");

        effectiveKidId = kidId;
    }

    var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.AssignedKidId == effectiveKidId);
    if (task is null) return Results.NotFound();

    if (task.IsComplete) return Results.Ok(task);

    task.IsComplete = true;
    task.CompletedAt = DateTime.UtcNow;

    var kid = await db.Kids.FirstOrDefaultAsync(k => k.Id == effectiveKidId);
    if (kid is null) return Results.NotFound("Kid not found.");

    kid.PointsBalance += task.Points;

    await db.SaveChangesAsync();
    return Results.Ok(task);
})
.RequireAuthorization("KidOrParent");


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

// ✅ Parent edits a reward
api.MapPut("/rewards/{id:int}", async (AppDbContext db, int id, UpdateRewardRequest req) =>
{
    var reward = await db.Rewards.FirstOrDefaultAsync(r => r.Id == id);
    if (reward is null) return Results.NotFound("Reward not found.");

    if (req.Name is not null)
    {
        var name = req.Name.Trim();
        if (string.IsNullOrWhiteSpace(name)) return Results.BadRequest("Name cannot be empty.");
        reward.Name = name;
    }

    if (req.Cost is not null)
    {
        if (req.Cost.Value < 0) return Results.BadRequest("Cost must be >= 0.");
        reward.Cost = req.Cost.Value;
    }

    await db.SaveChangesAsync();
    return Results.Ok(reward);
})
.RequireAuthorization("ParentOnly");

// ✅ Parent deletes a reward
api.MapDelete("/rewards/{id:int}", async (AppDbContext db, int id) =>
{
    var reward = await db.Rewards.FirstOrDefaultAsync(r => r.Id == id);
    if (reward is null) return Results.NotFound();

    db.Rewards.Remove(reward);
    await db.SaveChangesAsync();
    return Results.NoContent();
})
.RequireAuthorization("ParentOnly");

// Kid redeems a reward
api.MapPost("/rewards/{rewardId:int}/redeem", async (ClaimsPrincipal principal, AppDbContext db, int rewardId) =>
{
    var kidId = principal.FindFirstValue("kidId") ?? GetUserId(principal);
    if (string.IsNullOrWhiteSpace(kidId)) return Results.Unauthorized();

    var kid = await db.Kids.FirstOrDefaultAsync(k => k.Id == kidId);
    if (kid is null) return Results.NotFound("Kid not found.");

    var reward = await db.Rewards.FirstOrDefaultAsync(r => r.Id == rewardId);
    if (reward is null) return Results.NotFound("Reward not found.");

    if (kid.PointsBalance < reward.Cost)
        return Results.BadRequest("Not enough points.");

    // ✅ Deduct from saved balance
    kid.PointsBalance -= reward.Cost;

    // ✅ Keep redemption history
    var redemption = new Redemption
    {
        KidId = kidId,
        RewardId = rewardId,
        RedeemedAt = DateTime.UtcNow
    };

    db.Redemptions.Add(redemption);
    await db.SaveChangesAsync();

    return Results.Ok(new { kidId, newPoints = kid.PointsBalance, redemption });
})
.RequireAuthorization("KidOnly");


// -------------------- Todos --------------------

api.MapGet("/todos", async (AppDbContext db) =>
    Results.Ok(await db.Todos.OrderBy(t => t.Id).ToListAsync())
)
.RequireAuthorization(policy => policy.RequireRole("Parent", "Kid"));

api.MapPost("/todos", async (AppDbContext db, TodoItem todo) =>
{
    if (string.IsNullOrWhiteSpace(todo.Title))
        return Results.BadRequest("Title is required.");

    todo.Id = 0;
    todo.Title = todo.Title.Trim();

    db.Todos.Add(todo);
    await db.SaveChangesAsync();
    return Results.Created($"/api/todos/{todo.Id}", todo);
})
.RequireAuthorization(policy => policy.RequireRole("Parent", "Kid"));

api.MapPut("/todos/{id:int}", async (ClaimsPrincipal principal, AppDbContext db, int id, UpdateTodoRequest updated) =>
{
    var role = principal.FindFirstValue(ClaimTypes.Role);

    if (string.IsNullOrWhiteSpace(role))
        return Results.Forbid();

    var todo = await db.Todos.FirstOrDefaultAsync(t => t.Id == id);
    if (todo is null) return Results.NotFound();

    // ✅ Kids can ONLY toggle IsDone (and cannot change Title)
    if (role == "Kid")
    {
        if (updated.Title is not null)
            return Results.Forbid(); // or Results.BadRequest("Kids cannot edit titles.")

        if (updated.IsDone is null)
            return Results.BadRequest("IsDone is required.");

        todo.IsDone = updated.IsDone.Value;
        await db.SaveChangesAsync();
        return Results.Ok(todo);
    }

    // ✅ Parent behavior (full edit)
    if (updated.Title is not null && string.IsNullOrWhiteSpace(updated.Title))
        return Results.BadRequest("Title cannot be empty.");

    if (updated.Title is not null)
        todo.Title = updated.Title.Trim();

    if (updated.IsDone is not null)
        todo.IsDone = updated.IsDone.Value;

    await db.SaveChangesAsync();
    return Results.Ok(todo);
})
.RequireAuthorization(policy => policy.RequireRole("Parent", "Kid"));


api.MapDelete("/todos/{id:int}", async (AppDbContext db, int id) =>
{
    var todo = await db.Todos.FirstOrDefaultAsync(t => t.Id == id);
    if (todo is null) return Results.NotFound();

    db.Todos.Remove(todo);
    await db.SaveChangesAsync();
    return Results.NoContent();
})
.RequireAuthorization(policy => policy.RequireRole("Parent", "Kid"));



// -------------------- ✅ SPA fallback (deep links) --------------------
app.MapFallbackToFile("index.html");

app.Run();


// -------------------- Request DTOs --------------------
// Put these in the same file if you don't have them elsewhere.
// If they already exist, DO NOT duplicate them.

public record UpdateTaskRequest(string? Title, int? Points, string? AssignedKidId);
public record UpdateRewardRequest(string? Name, int? Cost);
public record UpdateTodoRequest(string? Title, bool? IsDone);
