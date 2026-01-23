// ============================================================
// Program.cs (Minimal API)
// - Wires up services (CORS, EF Core, JWT Auth) and maps endpoints
// - Also serves the SPA (static files + index.html fallback)
// ============================================================

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

// ============================================================
// 1) CORS (Cross-Origin Resource Sharing)
// - Browsers require the API to allow your frontend origin
// - We name the policy "Frontend" and restrict to known origins
// ============================================================

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(
                // Local dev origins
                "http://localhost:5173",
                "http://localhost:5000",

                // Deployed frontend origins
                "https://maximowinfield.github.io",
                "https://microsoft-fullstack-sample.onrender.com"
            )
            .AllowAnyHeader()  // allow Authorization, Content-Type, etc.
            .AllowAnyMethod()  // allow GET/POST/PUT/DELETE
    );
});

// ============================================================
// 2) Database (EF Core + SQLite)
// - DB_PATH lets Render point SQLite to a persistent disk location
// - If DB_PATH contains a directory (ex: /var/data/app.db), create it
// ============================================================

var dbPath = Environment.GetEnvironmentVariable("DB_PATH") ?? "app.db";

// If DB_PATH includes a directory (Render example: /var/data/app.db), ensure it exists
var dbDir = Path.GetDirectoryName(dbPath);
if (!string.IsNullOrWhiteSpace(dbDir))
{
    Directory.CreateDirectory(dbDir);
}

Console.WriteLine($"[DB] Using SQLite at: {dbPath}");

// Register AppDbContext so endpoints can accept (AppDbContext db) via DI
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// ============================================================
// 3) Password Hashing (Lightweight)
// - We use IPasswordHasher<AppUser> without the full Identity stack
// - Still stores passwords securely as hashes
// ============================================================

builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();

// ============================================================
// 4) JWT Authentication
// - JWT_SECRET is used to sign tokens
// - The API validates the signature + expiry on every request
// - RoleClaimType / NameClaimType controls how ClaimsPrincipal reads values
// ============================================================

// Read secret from configuration/env; fallback only for dev
var jwtSecret =
    builder.Configuration["JWT_SECRET"]
    ?? "dev-only-secret-change-me-32chars-minimum!!"; // 32+ chars recommended

// Symmetric key used to sign/verify tokens
var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            // We’re not using issuer/audience in this project (simple setup)
            ValidateIssuer = false,
            ValidateAudience = false,

            // Signature must match our server secret
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = jwtKey,

            // Reject expired tokens
            ValidateLifetime = true,

            // Small tolerance for clock differences between machines
            ClockSkew = TimeSpan.FromMinutes(1),

            // Tell ASP.NET where to read role + user id from
            RoleClaimType = ClaimTypes.Role,
            NameClaimType = ClaimTypes.NameIdentifier
        };
    });

// ============================================================
// 5) Authorization Policies
// - Policies simplify endpoint protection:
//   ParentOnly, KidOnly, and KidOrParent (shared access)
// ============================================================

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ParentOnly", policy => policy.RequireRole("Parent"));
    options.AddPolicy("KidOnly", policy => policy.RequireRole("Kid"));

    // Shared policy for endpoints that either Kid or Parent can call
    options.AddPolicy("KidOrParent", policy =>
        policy.RequireRole("Kid", "Parent"));
});

// Build the app (service provider + middleware pipeline ready)
var app = builder.Build();

// Simple debug/version endpoint (helps confirm you’re hitting the right build)
app.MapGet("/__version", () => Results.Text("CORS-GROUP-V1")).AllowAnonymous();

// ============================================================
// 6) SPA Static Files
// - UseDefaultFiles() looks for index.html automatically
// - UseStaticFiles() serves built frontend assets
// ============================================================

app.UseDefaultFiles();
app.UseStaticFiles();

// ============================================================
// 7) Middleware Pipeline (Order Matters)
// - Routing selects the endpoint
// - CORS must run before auth so preflight + requests get headers
// - Authentication builds ClaimsPrincipal from JWT
// - Authorization enforces roles/policies
// ============================================================

app.UseRouting();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

// ============================================================
// 8) /api Route Grouping
// - All API endpoints live under /api
// - RequireCors ensures API responses include the correct CORS headers
// ============================================================

var api = app.MapGroup("/api").RequireCors("Frontend");

// Preflight handler for anything under /api/*
// - Browsers send OPTIONS before certain requests (Authorization header, PUT/DELETE, etc.)
// - Returning 200 OK prevents “CORS preflight failed” issues
api.MapMethods("/{*path}", new[] { "OPTIONS" }, () => Results.Ok())
   .AllowAnonymous();

// ============================================================
// 9) Helpers
// - GetUserId: reliably pull user id from JWT claims
// - CreateToken: generate JWT for Parent or Kid sessions
// ============================================================

static string? GetUserId(ClaimsPrincipal principal)
{
    // NameIdentifier is our primary user id claim
    // Fallback to "sub" (standard JWT subject claim)
    return principal.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
}

string CreateToken(string subjectId, string role, string? kidId = null, string? parentId = null)
{
    // Core claims:
    // - sub / NameIdentifier = user identity
    // - role = authorization
    var claims = new List<Claim>
    {
        new Claim(JwtRegisteredClaimNames.Sub, subjectId),
        new Claim(ClaimTypes.NameIdentifier, subjectId),
        new Claim(ClaimTypes.Role, role),
    };

    // Extra app-specific claims (used by frontend + certain endpoints)
    if (!string.IsNullOrWhiteSpace(kidId))
        claims.Add(new Claim("kidId", kidId));

    if (!string.IsNullOrWhiteSpace(parentId))
        claims.Add(new Claim("parentId", parentId));

    // Create signed token
    var creds = new SigningCredentials(jwtKey, SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        claims: claims,
        expires: DateTime.UtcNow.AddHours(8),
        signingCredentials: creds
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
}

// ============================================================
// 10) Database Migrate + Seed (Safe Startup)
// - Ensures schema exists
// - Seeds a default Parent, Kids, Rewards, and Tasks if missing
// ============================================================

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Apply EF Core migrations automatically
    db.Database.Migrate();

    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();

    // -----------------------
    // Seed: default parent
    // -----------------------
    var parent = db.Users.FirstOrDefault(u => u.Username == "parent1" && u.Role == "Parent");
    if (parent == null)
    {
        parent = new AppUser
        {
            Id = Guid.NewGuid().ToString(),
            Username = "parent1",
            Role = "Parent"
        };

        // Store a hashed password (never store plaintext passwords)
        parent.PasswordHash = hasher.HashPassword(parent, "ChangeMe123");

        db.Users.Add(parent);
        db.SaveChanges();
    }

    var parentId = parent.Id;

    // -----------------------
    // Seed: kids for this parent
    // -----------------------
    if (!db.Kids.Any(k => k.ParentId == parentId))
    {
        db.Kids.AddRange(
            new KidProfile { Id = "kid-1", ParentId = parentId, DisplayName = "Kid 1" },
            new KidProfile { Id = "kid-2", ParentId = parentId, DisplayName = "Kid 2" }
        );
        db.SaveChanges();
    }

    // -----------------------
    // Seed: rewards (if empty)
    // -----------------------
    if (!db.Rewards.Any())
    {
        db.Rewards.AddRange(
            new Reward { Name = "Ice Cream", Cost = 100 },
            new Reward { Name = "Extra Screen Time", Cost = 50 },
            new Reward { Name = "Movie Night", Cost = 150 }
        );
        db.SaveChanges();
    }

    // -----------------------
    // Seed: tasks (if empty)
    // -----------------------
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

// ============================================================
// 11) Health Check
// - Basic endpoint to confirm API is running
// ============================================================

api.MapGet("/health", () => Results.Ok(new { status = "ok" }))
   .AllowAnonymous();

// ============================================================
// 12) Auth Endpoints
// - /parent/login: verifies parent credentials and returns Parent JWT
// - /kid-session: parent creates a "kid token" to act as a kid
// ============================================================

api.MapPost("/parent/login", async (AppDbContext db, IPasswordHasher<AppUser> hasher, ParentLoginRequest req) =>
{
    var username = (req.Username ?? "").Trim();
    var password = req.Password ?? "";

    // Reject missing credentials
    if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        return Results.Unauthorized();

    // Case-insensitive match + Parent role only
    var user = await db.Users.FirstOrDefaultAsync(u =>
        u.Role == "Parent" &&
        u.Username.ToLower() == username.ToLower()
    );

    if (user is null) return Results.Unauthorized();

    // Verify password hash
    var verified = hasher.VerifyHashedPassword(user, user.PasswordHash, password);
    if (verified == PasswordVerificationResult.Failed) return Results.Unauthorized();

    // Create a Parent JWT (role=Parent)
    var token = CreateToken(subjectId: user.Id, role: "Parent");

    return Results.Ok(new { token, role = "Parent" });
})
.AllowAnonymous();

api.MapPost("/kid-session", async (ClaimsPrincipal principal, AppDbContext db, KidSessionRequest req) =>
{
    // Parent must already be authenticated to create a kid session
    var parentId = GetUserId(principal);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    // Ensure kid belongs to this parent (ownership check)
    var kid = await db.Kids.FirstOrDefaultAsync(k => k.Id == req.KidId && k.ParentId == parentId);
    if (kid is null) return Results.NotFound("Kid not found for this parent.");

    // Create Kid JWT with kidId + parentId claims
    var kidToken = CreateToken(subjectId: kid.Id, role: "Kid", kidId: kid.Id, parentId: parentId);

    return Results.Ok(new { token = kidToken, role = "Kid", kidId = kid.Id, displayName = kid.DisplayName });
})
.RequireAuthorization("ParentOnly");

// ============================================================
// 13) Kids Endpoints (ParentOnly)
// - Parents list, create, and update kid profiles
// ============================================================

api.MapGet("/kids", async (ClaimsPrincipal principal, AppDbContext db) =>
{
    try
    {
        var parentId = GetUserId(principal);
        if (string.IsNullOrWhiteSpace(parentId))
            return Results.Unauthorized();

        // Debug logging to confirm parent filter + data
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

    // Ownership check: kid must belong to parent
    var kid = await db.Kids.FirstOrDefaultAsync(k => k.Id == kidId && k.ParentId == parentId);
    if (kid is null) return Results.NotFound("Kid not found for this parent.");

    kid.DisplayName = name;
    await db.SaveChangesAsync();

    return Results.Ok(kid);
})
.RequireAuthorization("ParentOnly");

// ============================================================
// 14) Tasks Endpoints
// - GET /tasks: Kid sees own tasks; Parent sees created tasks or filters by kidId
// - POST /tasks: Parent creates tasks for a kid
// - PUT /tasks/{id}: Parent edits tasks they created
// - PUT /tasks/{id}/complete: Kid completes own task OR Parent completes on behalf (KidOrParent policy)
// - DELETE /tasks/{id}: Parent deletes tasks they created
// ============================================================

api.MapGet("/tasks", async (ClaimsPrincipal principal, AppDbContext db, string? kidId) =>
{
    var role = principal.FindFirstValue(ClaimTypes.Role);

    // ----- Kid view: only their tasks -----
    if (role == "Kid")
    {
        // kidId claim is placed into the token when parent creates kid-session
        var kidClaim = principal.FindFirstValue("kidId") ?? GetUserId(principal);
        if (string.IsNullOrWhiteSpace(kidClaim)) return Results.Unauthorized();

        var tasks = await db.Tasks.Where(t => t.AssignedKidId == kidClaim).ToListAsync();
        return Results.Ok(tasks);
    }

    // ----- Parent view: their tasks -----
    var parentId = GetUserId(principal);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    var q = db.Tasks.AsQueryable();

    // If parent passes kidId, verify kid belongs to parent then filter
    if (!string.IsNullOrWhiteSpace(kidId))
    {
        var kidOwned = await db.Kids.AnyAsync(k => k.Id == kidId && k.ParentId == parentId);
        if (!kidOwned) return Results.BadRequest("Unknown kidId for this parent.");
        q = q.Where(t => t.AssignedKidId == kidId);
    }
    else
    {
        // Default: show tasks created by this parent
        q = q.Where(t => t.CreatedByParentId == parentId);
    }

    return Results.Ok(await q.ToListAsync());
})
.RequireAuthorization();

api.MapPost("/tasks", async (ClaimsPrincipal principal, AppDbContext db, CreateTaskRequest req) =>
{
    var parentId = GetUserId(principal);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    // Ownership check: Parent can only assign tasks to their own kids
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

// Parent edits a task they created
api.MapPut("/tasks/{id:int}", async (ClaimsPrincipal principal, AppDbContext db, int id, UpdateTaskRequest req) =>
{
    var parentId = GetUserId(principal);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.CreatedByParentId == parentId);
    if (task is null) return Results.NotFound("Task not found.");

    // Update title if provided
    if (req.Title is not null)
    {
        var title = req.Title.Trim();
        if (string.IsNullOrWhiteSpace(title)) return Results.BadRequest("Title cannot be empty.");
        task.Title = title;
    }

    // Update points if provided
    if (req.Points is not null)
    {
        if (req.Points.Value < 0) return Results.BadRequest("Points must be >= 0.");
        task.Points = req.Points.Value;
    }

    // Reassign to a different kid (must still belong to same parent)
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

// Complete a task:
// - Kid completes their own task
// - Parent can complete on behalf of a kid (must supply kidId + ownership check)
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

        // Ownership check: parent can only act on their own kids
        var kidOwned = await db.Kids.AnyAsync(k => k.Id == kidId && k.ParentId == parentId);
        if (!kidOwned) return Results.BadRequest("Unknown kidId for this parent.");

        effectiveKidId = kidId;
    }

    // Task must be assigned to the effectiveKidId
    var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.AssignedKidId == effectiveKidId);
    if (task is null) return Results.NotFound();

    // If already complete, return as-is (idempotent)
    if (task.IsComplete) return Results.Ok(task);

    // Mark complete + timestamp
    task.IsComplete = true;
    task.CompletedAt = DateTime.UtcNow;

    // Add points to the kid’s balance
    var kid = await db.Kids.FirstOrDefaultAsync(k => k.Id == effectiveKidId);
    if (kid is null) return Results.NotFound("Kid not found.");

    kid.PointsBalance += task.Points;

    // Record ledger transaction for history
    db.PointTransactions.Add(new PointTransaction
    {
        KidId = kid.Id,
        Type = PointTransactionType.Earn,
        Delta = task.Points,
        TaskId = task.Id,
        Note = $"Completed task: {task.Title}",
        CreatedAtUtc = DateTime.UtcNow
    });

    await db.SaveChangesAsync();
    return Results.Ok(task);
})
.RequireAuthorization("KidOrParent");

api.MapDelete("/tasks/{id:int}", async (ClaimsPrincipal principal, AppDbContext db, int id) =>
{
    var parentId = GetUserId(principal);
    if (string.IsNullOrWhiteSpace(parentId)) return Results.Unauthorized();

    // Parent can only delete tasks they created
    var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.CreatedByParentId == parentId);
    if (task is null) return Results.NotFound();

    db.Tasks.Remove(task);
    await db.SaveChangesAsync();

    return Results.NoContent();
})
.RequireAuthorization("ParentOnly");

// ============================================================
// 15) Points Endpoints
// - GET /points:
//   Kid: gets own balance
//   Parent: must provide kidId and pass ownership check
// ============================================================

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

        // Ownership check
        var kidOwned = await db.Kids.AnyAsync(k => k.Id == kidId && k.ParentId == parentId);
        if (!kidOwned) return Results.BadRequest("Unknown kidId for this parent.");

        effectiveKidId = kidId;
    }

    var kid = await db.Kids.FirstOrDefaultAsync(k => k.Id == effectiveKidId);
    if (kid is null) return Results.NotFound("Kid not found.");

    return Results.Ok(new { kidId = effectiveKidId, points = kid.PointsBalance });
})
.RequireAuthorization();

// ============================================================
// 16) Points History (Ledger)
// - Parent: can view a specific kid’s history (ownership check)
// - Kid: can view their own history
// ============================================================

api.MapGet("/kids/{kidId}/points/history", async (ClaimsPrincipal principal, AppDbContext db, string kidId) =>
{
    var parentId = GetUserId(principal);
    if (string.IsNullOrWhiteSpace(parentId))
        return Results.Unauthorized();

    // Parent can only view history for their own kid
    var kidOwned = await db.Kids.AnyAsync(k => k.Id == kidId && k.ParentId == parentId);
    if (!kidOwned)
        return Results.BadRequest("Unknown kidId for this parent.");

    var history = await db.PointTransactions
        .Where(x => x.KidId == kidId)
        .OrderByDescending(x => x.CreatedAtUtc)
        .Select(x => new
        {
            x.Id,
            x.Type,
            x.Delta,
            x.Note,
            x.TaskId,
            x.RedemptionId,
            x.CreatedAtUtc
        })
        .ToListAsync();

    return Results.Ok(history);
})
.RequireAuthorization("ParentOnly");

// Kid-friendly: current kid views their own points history
api.MapGet("/points/history", async (ClaimsPrincipal principal, AppDbContext db) =>
{
    var role = principal.FindFirstValue(ClaimTypes.Role);
    if (role != "Kid") return Results.Forbid();

    var kidId = principal.FindFirstValue("kidId") ?? GetUserId(principal);
    if (string.IsNullOrWhiteSpace(kidId)) return Results.Unauthorized();

    var history = await db.PointTransactions
        .Where(x => x.KidId == kidId)
        .OrderByDescending(x => x.CreatedAtUtc)
        .Select(x => new
        {
            x.Id,
            x.Type,
            x.Delta,
            x.Note,
            x.TaskId,
            x.RedemptionId,
            x.CreatedAtUtc
        })
        .ToListAsync();

    return Results.Ok(new { kidId, history });
})
.RequireAuthorization("KidOnly");

// ============================================================
// 17) Rewards + Redemptions
// - GET /rewards: anyone logged in can view rewards
// - Parent: create/edit/delete rewards
// - Kid: redeem rewards (deduct points + create redemption + ledger entry)
// ============================================================

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

api.MapDelete("/rewards/{id:int}", async (AppDbContext db, int id) =>
{
    var reward = await db.Rewards.FirstOrDefaultAsync(r => r.Id == id);
    if (reward is null) return Results.NotFound();

    db.Rewards.Remove(reward);
    await db.SaveChangesAsync();
    return Results.NoContent();
})
.RequireAuthorization("ParentOnly");

// Kid redeems reward:
// - Must have enough points
// - Deduct points from balance
// - Store redemption + ledger transaction (Spend)
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

    // Deduct points
    kid.PointsBalance -= reward.Cost;

    // Create redemption record
    var redemption = new Redemption
    {
        KidId = kidId,
        RewardId = rewardId,
        RedeemedAt = DateTime.UtcNow
    };

    db.Redemptions.Add(redemption);
    await db.SaveChangesAsync(); // redemption.Id available now

    // Ledger entry for spend history
    db.PointTransactions.Add(new PointTransaction
    {
        KidId = kidId,
        Type = PointTransactionType.Spend,
        Delta = -reward.Cost,
        RedemptionId = redemption.Id,
        Note = $"Redeemed reward: {reward.Name}",
        CreatedAtUtc = DateTime.UtcNow
    });

    await db.SaveChangesAsync();

    return Results.Ok(new { kidId, newPoints = kid.PointsBalance, redemption });
})
.RequireAuthorization("KidOnly");

// ============================================================
// 18) Todos (Shared Parent/Kid)
// - GET: list todos
// - POST: add todo
// - PUT:
//    Kid: can ONLY toggle IsDone
//    Parent: can edit Title and IsDone
// - DELETE: remove todo
// ============================================================

api.MapGet("/todos", async (AppDbContext db) =>
    Results.Ok(await db.Todos.OrderBy(t => t.Id).ToListAsync())
)
.RequireAuthorization(policy => policy.RequireRole("Parent", "Kid"));

api.MapPost("/todos", async (AppDbContext db, TodoItem todo) =>
{
    if (string.IsNullOrWhiteSpace(todo.Title))
        return Results.BadRequest("Title is required.");

    // Force EF to treat as new row
    todo.Id = 0;

    // Normalize
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

    // Kid rules: only toggle IsDone
    if (role == "Kid")
    {
        if (updated.Title is not null)
            return Results.Forbid(); // kids cannot edit titles

        if (updated.IsDone is null)
            return Results.BadRequest("IsDone is required.");

        todo.IsDone = updated.IsDone.Value;
        await db.SaveChangesAsync();
        return Results.Ok(todo);
    }

    // Parent rules: full edit
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

// ============================================================
// 19) SPA Fallback (Deep Links)
// - If user refreshes on /parent/kids or /kid/tasks, the server serves index.html
// - React Router then takes over client-side routing
// ============================================================

app.MapFallbackToFile("index.html");

app.Run();

// ============================================================
// 20) Request DTOs (Update Models)
// - Kept here if you don't have separate DTO files
// - If you already have them elsewhere, do not duplicate
// ============================================================

public record UpdateTaskRequest(string? Title, int? Points, string? AssignedKidId);
public record UpdateRewardRequest(string? Name, int? Cost);
public record UpdateTodoRequest(string? Title, bool? IsDone);
