using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Data;
using TaskFlow.Dtos;
using TaskFlow.Models;
using TaskFlow.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------
// JWT key must come from environment variables (JWT__KEY) or user secrets.
// It must never be committed with a real value.
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
{
    throw new InvalidOperationException(
        "JWT key is missing or too short. Set the JWT__KEY environment variable (minimum 32 characters) " +
        "or configure it via user secrets (dotnet user-secrets set Jwt:Key <key>). " +
        "Never commit a real JWT key to source control.");
}

// Demo credentials, when demo mode is enabled, must also come from configuration
// or environment variables (DEMO__EMAIL, DEMO__PASSWORD, DEMO__NAME).
var demoEnabled = builder.Configuration.GetValue("Demo:Enabled", false);
if (demoEnabled)
{
    var demoEmail = builder.Configuration["Demo:Email"];
    var demoPassword = builder.Configuration["Demo:Password"];
    if (string.IsNullOrWhiteSpace(demoEmail) || string.IsNullOrWhiteSpace(demoPassword))
    {
        throw new InvalidOperationException(
            "Demo mode is enabled but Demo:Email and Demo:Password are not configured. " +
            "Set DEMO__EMAIL and DEMO__PASSWORD environment variables, or disable demo mode.");
    }
    if (demoPassword!.Length < 8)
    {
        throw new InvalidOperationException("Demo password must be at least 8 characters.");
    }
}

builder.Services.AddOpenApi();

// CORS origins are configuration-driven; no hardcoded production origins.
var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? Array.Empty<string>();
if (corsOrigins.Length == 0 && builder.Environment.IsDevelopment())
{
    corsOrigins = ["http://localhost:5173"];
}
if (corsOrigins.Length > 0)
{
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy.WithOrigins(corsOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
    });
}

builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IWorkspaceService, WorkspaceService>();
builder.Services.AddScoped<IActivityService, ActivityService>();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sql => sql.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// ---------------------------------------------------------------
// Middleware pipeline
// ---------------------------------------------------------------
// Consistent JSON error responses.
app.UseExceptionHandler(appBuilder =>
{
    appBuilder.Run(async context =>
    {
        var feature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        var exception = feature?.Error;
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();

        var (status, message) = exception switch
        {
            ValidationException v => (StatusCodes.Status400BadRequest, v.Message),
            ForbiddenException f => (StatusCodes.Status403Forbidden, f.Message),
            DbUpdateConcurrencyException => (
                StatusCodes.Status409Conflict,
                "This record was changed by another request. Refresh and try again."),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.")
        };

        if (status == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Unhandled exception");

        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { error = message }));
    });
});

if (corsOrigins.Length > 0)
    app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
static int GetUserId(ClaimsPrincipal user)
{
    var claim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    return int.TryParse(claim, out var id) ? id : throw new ForbiddenException("Invalid token.");
}

// Minimal APIs do not validate DataAnnotations automatically; apply them
// consistently at the edge so contracts fail fast with clear messages.
static IResult? ValidateDto<T>(T dto)
{
    var results = new List<System.ComponentModel.DataAnnotations.ValidationResult>();
    var valid = System.ComponentModel.DataAnnotations.Validator.TryValidateObject(
        dto!,
        new System.ComponentModel.DataAnnotations.ValidationContext(dto!),
        results,
        validateAllProperties: true);
    if (valid) return null;
    return Results.ValidationProblem(
        results.GroupBy(r => r.MemberNames.FirstOrDefault() ?? string.Empty)
               .ToDictionary(
                   g => g.Key,
                   g => g.Select(r => r.ErrorMessage ?? "The field is invalid.").ToArray()));
}

// ---------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------
app.MapGet("/api/health", () => new { status = "Healthy", timestamp = DateTime.UtcNow });

app.MapPost("/api/auth/register", async (RegisterDto dto, IAuthService authService) =>
{
    var invalid = ValidateDto(dto);
    if (invalid is not null) return invalid;
    var result = await authService.Register(dto);
    if (!result.Success)
        return Results.BadRequest(new { error = result.Error });
    return Results.Ok(new { token = result.Token });
});

app.MapPost("/api/auth/login", async (LoginDto dto, IAuthService authService) =>
{
    var invalid = ValidateDto(dto);
    if (invalid is not null) return invalid;
    var result = await authService.Login(dto);
    if (!result.Success)
        return Results.BadRequest(new { error = result.Error });
    return Results.Ok(new { token = result.Token });
});

// ---------------------------------------------------------------
// Protected endpoints (JWT required)
// ---------------------------------------------------------------
var api = app.MapGroup("/api").RequireAuthorization();

api.MapGet("/workspace", async (ClaimsPrincipal user, IWorkspaceService workspaceService) =>
    Results.Ok(await workspaceService.GetWorkspaceAsync(GetUserId(user))));

// Projects
api.MapGet("/projects", async (ClaimsPrincipal user, IProjectService projectService, int page = 1, int pageSize = 50) =>
    Results.Ok(await projectService.ListAsync(GetUserId(user), page, pageSize)));

api.MapGet("/projects/{id}", async (int id, ClaimsPrincipal user, IProjectService projectService) =>
{
    var project = await projectService.GetAsync(id, GetUserId(user));
    return project is not null ? Results.Ok(project) : Results.NotFound();
});

api.MapPost("/projects", async (CreateProjectDto dto, ClaimsPrincipal user, IProjectService projectService) =>
{
    var invalid = ValidateDto(dto);
    if (invalid is not null) return invalid;
    var created = await projectService.CreateAsync(dto, GetUserId(user));
    return Results.Created($"/api/projects/{created.Id}", created);
});

api.MapPut("/projects/{id}", async (int id, JsonElement patch, ClaimsPrincipal user, IProjectService projectService) =>
{
    var updated = await projectService.UpdateAsync(id, patch, GetUserId(user));
    return updated is not null ? Results.Ok(updated) : Results.NotFound();
});

api.MapPut("/projects/{id}/status", async (int id, SetProjectStatusDto dto, ClaimsPrincipal user, IProjectService projectService) =>
{
    if (!AppConstants.IsValidProjectStatus(dto.Status))
        return Results.BadRequest(new { error = $"Invalid status '{dto.Status}'. Allowed: {string.Join(", ", AppConstants.ProjectStatuses)}" });
    var updated = await projectService.SetStatusAsync(id, dto.Status, GetUserId(user));
    return updated is not null ? Results.Ok(updated) : Results.NotFound();
});

api.MapDelete("/projects/{id}", async (int id, ClaimsPrincipal user, IProjectService projectService) =>
    await projectService.DeleteAsync(id, GetUserId(user)) ? Results.NoContent() : Results.NotFound());

api.MapPost("/projects/{id}/members", async (int id, MemberRequestDto dto, ClaimsPrincipal user, IProjectService projectService) =>
{
    var invalid = ValidateDto(dto);
    if (invalid is not null) return invalid;
    return await projectService.AddMemberAsync(id, dto.UserId, GetUserId(user)) ? Results.Ok() : Results.NotFound();
});

api.MapDelete("/projects/{id}/members/{userId}", async (int id, int userId, ClaimsPrincipal user, IProjectService projectService) =>
    await projectService.RemoveMemberAsync(id, userId, GetUserId(user)) ? Results.NoContent() : Results.NotFound());

// Tasks
api.MapGet("/tasks", async (ClaimsPrincipal user, ITaskService taskService, int? projectId, string? status, int page = 1, int pageSize = 50) =>
    Results.Ok(await taskService.ListAsync(GetUserId(user), projectId, status, page, pageSize)));

api.MapGet("/projects/{projectId}/tasks", async (int projectId, ClaimsPrincipal user, ITaskService taskService, int page = 1, int pageSize = 50) =>
    Results.Ok(await taskService.ListAsync(GetUserId(user), projectId, null, page, pageSize)));

api.MapPost("/tasks", async (CreateTaskDto dto, ClaimsPrincipal user, ITaskService taskService) =>
{
    var invalid = ValidateDto(dto);
    if (invalid is not null) return invalid;
    var task = await taskService.CreateAsync(dto, GetUserId(user));
    return Results.Created($"/api/tasks/{task.Id}", task);
});

api.MapGet("/tasks/{id}", async (int id, ClaimsPrincipal user, ITaskService taskService) =>
{
    var task = await taskService.GetAsync(id, GetUserId(user));
    return task is not null ? Results.Ok(task) : Results.NotFound();
});

api.MapPut("/tasks/{id}", async (int id, JsonElement patch, ClaimsPrincipal user, ITaskService taskService) =>
{
    var updated = await taskService.UpdateAsync(id, patch, GetUserId(user));
    return updated is not null ? Results.Ok(updated) : Results.NotFound();
});

api.MapDelete("/tasks/{id}", async (int id, ClaimsPrincipal user, ITaskService taskService) =>
    await taskService.DeleteAsync(id, GetUserId(user)) ? Results.NoContent() : Results.NotFound());

api.MapPost("/tasks/{id}/move", async (int id, MoveTaskDto dto, ClaimsPrincipal user, ITaskService taskService) =>
{
    var invalid = ValidateDto(dto);
    if (invalid is not null) return invalid;
    var column = await taskService.MoveAsync(id, dto, GetUserId(user));
    return column is not null ? Results.Ok(column) : Results.NotFound();
});

api.MapPost("/tasks/{taskId}/subtasks/{subtaskId}/toggle", async (int taskId, int subtaskId, ClaimsPrincipal user, ITaskService taskService) =>
{
    var task = await taskService.ToggleSubtaskAsync(taskId, subtaskId, GetUserId(user));
    return task is not null ? Results.Ok(task) : Results.NotFound();
});

api.MapPost("/tasks/{taskId}/comments", async (int taskId, AddCommentDto dto, ClaimsPrincipal user, ITaskService taskService) =>
{
    var invalid = ValidateDto(dto);
    if (invalid is not null) return invalid;
    var comment = await taskService.AddCommentAsync(taskId, dto.Body, GetUserId(user));
    return comment is not null ? Results.Created($"/api/tasks/{taskId}/comments/{comment.Id}", comment) : Results.NotFound();
});

// Recent activity feed across every project the caller can see.
api.MapGet("/activities", async (ClaimsPrincipal user, IActivityService activityService, int page = 1, int pageSize = 50) =>
    Results.Ok(await activityService.ListAsync(GetUserId(user), page, pageSize)));

// Current user profile
api.MapGet("/users/me", async (ClaimsPrincipal user, IUserService userService) =>
{
    var profile = await userService.GetProfileAsync(GetUserId(user));
    return profile is not null ? Results.Ok(profile) : Results.NotFound();
});

api.MapPut("/users/me", async (JsonElement patch, ClaimsPrincipal user, IUserService userService) =>
{
    var updated = await userService.UpdateProfileAsync(GetUserId(user), patch);
    return updated is not null ? Results.Ok(updated) : Results.NotFound();
});

// Demo reset: admin-only AND demo mode enabled AND not production (never available in production).
    api.MapPost("/workspace/reset", async (ClaimsPrincipal user, ApplicationDbContext db, IConfiguration config, IHostEnvironment env) =>
    {
        if (env.IsProduction())
            return Results.StatusCode(StatusCodes.Status403Forbidden);

        var actor = await db.Users.FindAsync(GetUserId(user));
        if (actor?.Role != "admin")
            return Results.StatusCode(StatusCodes.Status403Forbidden);

        if (!config.GetValue("Demo:Enabled", false))
            return Results.StatusCode(StatusCodes.Status403Forbidden);

    db.Activities.RemoveRange(db.Activities);
    db.Comments.RemoveRange(db.Comments);
    db.SubTasks.RemoveRange(db.SubTasks);
    db.Tasks.RemoveRange(db.Tasks);
    db.Projects.RemoveRange(db.Projects);
    db.Users.RemoveRange(db.Users);
    await db.SaveChangesAsync();

    await DatabaseSeeder.SeedAsync(db, config);
    return Results.NoContent();
});

// ---------------------------------------------------------------
// Database initialization: apply migrations (opt-in via config),
// then seed demo data exactly once when the Users table is empty.
// ---------------------------------------------------------------
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var autoMigrate = builder.Configuration.GetValue("Database:AutoMigrate", true);
    if (autoMigrate)
        await dbContext.Database.MigrateAsync();

    await DatabaseSeeder.SeedAsync(dbContext, builder.Configuration);
}

app.Run();
