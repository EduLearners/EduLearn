using System.Text.Json;

namespace EduLearn.API.Middleware;

// Catches unhandled exceptions thrown anywhere below it in the pipeline
// (controller → service → repository → EF Core) and returns a clean JSON
// response. Intentional return BadRequest/NotFound(...) calls are NOT
// exceptions and pass through this middleware untouched. JWT 401/403 are
// handled separately by the JwtBearer OnChallenge/OnForbidden events.
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Unhandled exception for {Method} {Path}",
                context.Request.Method,
                context.Request.Path);

            await WriteResponseAsync(context, ex);
        }
    }

    private async Task WriteResponseAsync(HttpContext context, Exception ex)
    {
        // If MVC has already started writing the response (e.g. serializer
        // threw mid-stream), Clear() throws InvalidOperationException and the
        // middleware itself becomes the unhandled exception. Bail out and let
        // the framework's default handler take over with whatever bytes were
        // already on the wire.
        if (context.Response.HasStarted)
        {
            _logger.LogError(ex,
                "Response already started for {Method} {Path} — cannot write error JSON",
                context.Request.Method, context.Request.Path);
            return;
        }

        var statusCode = MapStatusCode(ex);

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        object payload = _env.IsDevelopment()
            ? new
            {
                error = "An unexpected error occurred. Please try again or contact support.",
                statusCode,
                timestamp = DateTime.UtcNow,
                traceId = context.TraceIdentifier,
                exceptionType = ex.GetType().FullName,
                detail = ex.Message
            }
            : new
            {
                error = "An unexpected error occurred. Please try again or contact support.",
                statusCode,
                timestamp = DateTime.UtcNow,
                traceId = context.TraceIdentifier
            };

        await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
    }

    private static int MapStatusCode(Exception ex) => ex switch
    {
        KeyNotFoundException        => 404,
        UnauthorizedAccessException => 403,
        ArgumentException           => 400,
        InvalidOperationException   => 400,
        _                           => 500
    };
}
