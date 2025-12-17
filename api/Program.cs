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

// CORS: allow dev origins (adjust for production)
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(
                "https://maximowinfield.github.io",
                "http://localhost:5173"
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
var jwtSecret = builder.Configuration["JWT_SECRET"] ?? "dev-only-secret-change-me";
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

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

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

    // Seed 2 parents if none exist
    // ---- Seed default parents (Option B) ----
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


    var firstParentId = db.Users.Where(u => u.Role == "Parent").Select(u => u.Id).First();

    // Seed kids once (owned by first parent)
    if (!db.Kids.Any())
    {
        db.Kids.AddRange(
            new KidProfile { Id = "kid-1", ParentId = firstParentId, DisplayName = "Kid 1" },
            new KidProfile { Id = "kid-2", ParentId = firstParentId, DisplayName = "Kid 2" }
        );
        db.SaveChanges();
    }
}

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

// -------------------- Auth (Option B) --------------------


// Parent login: returns Parent token
app.MapPost("/api/parent/login", async (AppDbContext db, IPasswordHasher<AppUser> hasher, ParentLoginRequest req) =>
{
    var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Username && u.Role == "Parent");
    if (user is null) return Results.Unauthorized();

    var verified = hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
    if (verified == PasswordVerificationResult.Failed) return Results.Unauthorized();

    var token = CreateToken(subjectId: user.Id, role: "Parent");
    return Results.Ok(new { token, role = "Parent" });
});

// Parent enters Kid Mode: returns Kid token scoped to a kid profile
app.MapPost("/api/kid-session", async (ClaimsPrincipal principal, AppDbContext db, KidSessionRequest req) =>
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
app.MapGet("/api/kids", async (ClaimsPrincipal principal, AppDbContext db) =>
{
    var parentId = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    var kids = await db.Kids.Where(k => k.ParentId == parentId).ToListAsync();
    return Results.Ok(kids);
})
.RequireAuthorization("ParentOnly");

// -------------------- Tasks --------------------

// Parent can view tasks (optionally filter by kidId, but only if kid belongs to parent)
app.MapGet("/api/tasks", async (ClaimsPrincipal principal, AppDbContext db, string? kidId) =>
{
    var role = principal.FindFirstValue(ClaimTypes.Role);

    if (role == "Kid")
    {
        // Kid can only see their tasks (ignore kidId query)
        var kidClaim = principal.FindFirstValue("kidId") ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (string.IsNullOrWhiteSpace(kidClaim)) return Results.Unauthorized();

        var tasks = await db.Tasks.Where(t => t.AssignedKidId == kidClaim).ToListAsync();
        return Results.Ok(tasks);
    }

    // Parent path
    var parentId = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    var q = db.Tasks.AsQueryable();

    if (!string.IsNullOrWhiteSpace(kidId))
    {
        // only allow filtering to kid owned by parent
        var kidOwned = await db.Kids.AnyAsync(k => k.Id == kidId && k.ParentId == parentId);
        if (!kidOwned) return Results.BadRequest("Unknown kidId for this parent.");
        q = q.Where(t => t.AssignedKidId == kidId);
    }
    else
    {
        // Only tasks created by this parent
        q = q.Where(t => t.CreatedByParentId == parentId);
    }

    return Results.Ok(await q.ToListAsync());
})
.RequireAuthorization(); // either Parent or Kid token

// Parent creates tasks; server sets CreatedByParentId
app.MapPost("/api/tasks", async (ClaimsPrincipal principal, AppDbContext db, CreateTaskRequest req) =>
{
    var parentId = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    // kid must belong to this parent
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

// Kid completes tasks; must be assigned to that kid
app.MapPut("/api/tasks/{id:int}/complete", async (ClaimsPrincipal principal, AppDbContext db, int id) =>
{
    var kidId = principal.FindFirstValue("kidId") ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (string.IsNullOrWhiteSpace(kidId)) return Results.Unauthorized();

    var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.AssignedKidId == kidId);
    if (task is null) return Results.NotFound();

    if (task.IsComplete) return Results.Ok(task); // no double points

    task.IsComplete = true;
    task.CompletedAt = DateTime.UtcNow;

    await db.SaveChangesAsync();
    return Results.Ok(task);
})
.RequireAuthorization("KidOnly");

// Parent deletes tasks they created
app.MapDelete("/api/tasks/{id:int}", async (ClaimsPrincipal principal, AppDbContext db, int id) =>
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
// Kid token: returns their points
// Parent token: can request points for a kid they own via ?kidId=
app.MapGet("/api/points", async (ClaimsPrincipal principal, AppDbContext db, string? kidId) =>
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
.RequireAuthorization(); // Parent or Kid token

// -------------------- Rewards + Redemptions --------------------

// Everyone can view rewards (both Parent and Kid)
app.MapGet("/api/rewards", async (AppDbContext db) =>
    Results.Ok(await db.Rewards.ToListAsync())
);

// Parent creates rewards
app.MapPost("/api/rewards", async (AppDbContext db, CreateRewardRequest req) =>
{
    var reward = new Reward { Name = req.Name, Cost = req.Cost };
    db.Rewards.Add(reward);
    await db.SaveChangesAsync();

    return Results.Created($"/api/rewards/{reward.Id}", reward);
})
.RequireAuthorization("ParentOnly");

// Kid redeems a reward for themselves (no kidId querystring)
app.MapPost("/api/rewards/{rewardId:int}/redeem", async (ClaimsPrincipal principal, AppDbContext db, int rewardId) =>
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

// -------------------- Todos (NOW PERSISTENT) --------------------
// Keep as-is. If you want, you can later lock these behind ParentOnly.
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
