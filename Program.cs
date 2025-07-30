using iVA.Data;
using iVA.Services;
using iVA.Workers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("https://localhost:44390", "http://localhost:5173") // Example for dev
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});


var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
        };
    });

builder.Services.AddControllers();

builder.Services.AddSingleton<ApplicationStatusService>();
builder.Services.AddSingleton<ObjectDetectionService>();
builder.Services.AddSingleton<OCRService>();
builder.Services.AddSingleton<GeminiService>();
builder.Services.AddSingleton<LogFileWriterService>();
builder.Services.AddScoped<TokenService>(); // Add TokenService

builder.Services.AddHostedService<LogProcessingWorker>();
builder.Services.AddHostedService<ModelLoadingService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthentication(); // Ensure this is before UseAuthorization
app.UseAuthorization();

app.MapControllers();

app.Run();

public static class SharedLocks
{
    public static readonly object LogFileLock = new object();
}