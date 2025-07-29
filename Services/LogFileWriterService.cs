using iVA.Models;
using System.Text.Json;

namespace iVA.Services
{
    public class LogFileWriterService
    {
        private readonly string _logFilePath;
        public LogFileWriterService(IWebHostEnvironment env)
        {
            var logDir = Path.Combine(env.ContentRootPath, "logs");
            Directory.CreateDirectory(logDir);
            _logFilePath = Path.Combine(logDir, "iva.log");
        }

        public Task WriteLogAsync(DetectionLog log)
        {
            var jsonLog = JsonSerializer.Serialize(log);

            lock (SharedLocks.LogFileLock)
            {
                File.AppendAllText(_logFilePath, jsonLog + Environment.NewLine);
            }

            return Task.CompletedTask;
        }
    }
}