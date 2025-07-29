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
        private static readonly object _fileLock = new object();

        public LogProcessingWorker(ILogger<LogProcessingWorker> logger, IServiceProvider serviceProvider, IWebHostEnvironment env)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            var logDir = Path.Combine(env.ContentRootPath, "logs");
            _logFilePath = Path.Combine(logDir, "iva_temporary.log");
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
            lock (_fileLock)
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

            var reliableLogs = allLogs.Where(l => l.ObjectCount > 0).ToList();
            if (!reliableLogs.Any())
            {
                _logger.LogInformation("No reliable logs to process in this batch.");
                return;
            }

            var bestLog = reliableLogs.OrderByDescending(l => l.ObjectCount).First();

            using (var scope = _serviceProvider.CreateScope())
            {
                var geminiService = scope.ServiceProvider.GetRequiredService<GeminiService>();

                var dummyDetections = bestLog.ObjectsDetected.Split(", ").Select(name => new Detection { ClassName = name }).ToList();

                _logger.LogInformation("Generating scene description for the best log...");
                bestLog.SceneDescription = await geminiService.GenerateSceneDescriptionAsync(dummyDetections, bestLog.ExtractedText);

                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                dbContext.DetectionLogs.Add(bestLog);
                await dbContext.SaveChangesAsync();

                _logger.LogInformation("Saved best log from batch to database. Detected {ObjectCount} objects.", bestLog.ObjectCount);
            }
        }
    }
}