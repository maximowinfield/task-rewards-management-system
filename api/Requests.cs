public record CreateKidRequest(string DisplayName);
public record UpdateKidRequest(string DisplayName);

// If these types currently live in Program.cs too, move them here:
public record ParentLoginRequest(string Username, string Password);
public record KidSessionRequest(string KidId);
public record CreateTaskRequest(string Title, int Points, string AssignedKidId);
public record CreateRewardRequest(string Name, int Cost);
