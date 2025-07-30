using iVA.Data;
using iVA.Models;
using iVA.Services;
using System.Text.Json;

namespace iVA.Workers
{
    public class LogProcessingWorker : BackgroundService
    {
        private readonly ILogger<LogProcessingWorker> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly string _logFilePath;

        public LogProcessingWorker(ILogger<LogProcessingWorker> logger, IServiceProvider serviceProvider, IWebHostEnvironment env)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            var logDir = Path.Combine(env.ContentRootPath, "logs");
            _logFilePath = Path.Combine(logDir, "iva.log");
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Log Processing Worker running.");

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
                await ProcessLogFileAsync();
            }
        }

        private async Task ProcessLogFileAsync()
        {
            List<string> logLines;

            lock (SharedLocks.LogFileLock)
            {
                if (!File.Exists(_logFilePath)) return;
                logLines = File.ReadAllLines(_logFilePath).ToList();
                File.WriteAllText(_logFilePath, string.Empty);
            }

            if (!logLines.Any()) return;

            var allLogs = new List<DetectionLog>();
            foreach (var line in logLines)
            {
                try
                {
                    var log = JsonSerializer.Deserialize<DetectionLog>(line);
                    if (log != null) allLogs.Add(log);
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "Failed to deserialize log line: {LogLine}", line);
                }
            }

            // Group logs by user to process them in batches per user
            var logsByUser = allLogs.GroupBy(l => l.UserId);

            foreach (var userLogGroup in logsByUser)
            {
                var reliableLogs = userLogGroup.Where(l => l.ObjectCount > 0).ToList();
                if (!reliableLogs.Any())
                {
                    _logger.LogInformation("No reliable logs to process for user {UserId} in this batch.", userLogGroup.Key);
                    continue;
                }

                var bestLog = reliableLogs.OrderByDescending(l => l.ObjectCount).First();

                if (string.IsNullOrEmpty(bestLog.ImageBase64))
                {
                    _logger.LogWarning("Best log found for user {UserId} but it is missing image data. Skipping Gemini analysis.", userLogGroup.Key);
                    continue;
                }

                using (var scope = _serviceProvider.CreateScope())
                {
                    var geminiService = scope.ServiceProvider.GetRequiredService<GeminiService>();

                    var dummyDetections = bestLog.ObjectsDetected.Split(", ", StringSplitOptions.RemoveEmptyEntries)
                                                .Select(name => new Detection { ClassName = name }).ToList();

                    var imageBytes = Convert.FromBase64String(bestLog.ImageBase64);

                    _logger.LogInformation("Generating scene analysis for the best log (User: {UserId}) using multimodal input...", userLogGroup.Key);

                    bestLog.SceneDescription = await geminiService.GenerateSceneDescriptionAsync(imageBytes, dummyDetections, bestLog.ExtractedText);

                    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    dbContext.DetectionLogs.Add(bestLog);
                    await dbContext.SaveChangesAsync();

                    _logger.LogInformation("Saved best log from batch to database for user {UserId}. Detected {ObjectCount} objects.", userLogGroup.Key, bestLog.ObjectCount);
                }
            }
        }
    }
}