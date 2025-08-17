using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

// CORS: allow dev origins (adjust for production)
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()
));

var app = builder.Build();

app.UseCors();

// In-memory store for simplicity
var todos = new List<Todo>
{
    new Todo { Id = 1, Title = "Sample: apply to Microsoft internship", IsDone = false },
    new Todo { Id = 2, Title = "Sample: push this project to GitHub", IsDone = false }
};

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/todos", () => Results.Ok(todos));

app.MapPost("/api/todos", (Todo todo) =>
{
    var nextId = todos.Count == 0 ? 1 : todos.Max(t => t.Id) + 1;
    todo.Id = nextId;
    todos.Add(todo);
    return Results.Created($"/api/todos/{todo.Id}", todo);
});

app.MapPut("/api/todos/{id:int}", (int id, Todo updated) =>
{
    var idx = todos.FindIndex(t => t.Id == id);
    if (idx == -1) return Results.NotFound();
    updated.Id = id;
    todos[idx] = updated;
    return Results.Ok(updated);
});

app.MapDelete("/api/todos/{id:int}", (int id) =>
{
    var removed = todos.RemoveAll(t => t.Id == id) > 0;
    return removed ? Results.NoContent() : Results.NotFound();
});

app.Run();

record Todo
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public bool IsDone { get; set; }
}