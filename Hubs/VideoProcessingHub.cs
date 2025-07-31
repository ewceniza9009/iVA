using iVA.Models;
using iVA.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace iVA.Hubs
{
    [Authorize] 
    public class VideoProcessingHub : Hub
    {
        private readonly ObjectDetectionService _detectionService;
        private readonly OCRService _ocrService;
        private readonly LogFileWriterService _logWriter;
        private readonly ILogger<VideoProcessingHub> _logger;

        public VideoProcessingHub(
            ObjectDetectionService detectionService,
            OCRService ocrService,
            LogFileWriterService logWriter,
            ILogger<VideoProcessingHub> logger)
        {
            _detectionService = detectionService;
            _ocrService = ocrService;
            _logWriter = logWriter;
            _logger = logger;
        }

        public async Task ProcessFrame(string imageBase64)
        {
            try
            {
                if (string.IsNullOrEmpty(imageBase64))
                {
                    return;
                }

                var userIdString = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!int.TryParse(userIdString, out var userId))
                {
                    _logger.LogWarning("No user found, defaulting to user ID {UserId} for testing.", userId);
                }

                var imageBytes = System.Convert.FromBase64String(imageBase64);

                var detectionTask = _detectionService.DetectObjectsAsync(imageBytes);
                var ocrTask = _ocrService.ExtractTextAsync(imageBytes);
                await Task.WhenAll(detectionTask, ocrTask);

                var detections = detectionTask.Result;
                var extractedText = ocrTask.Result;

                var log = new DetectionLog
                {
                    Timestamp = System.DateTime.Now,
                    ObjectsDetected = string.Join(", ", detections.Select(d => d.ClassName)),
                    ObjectCount = detections.Count,
                    ExtractedText = extractedText,
                    SceneDescription = null,
                    ImageBase64 = imageBase64,
                    UserId = userId
                };

                await _logWriter.WriteLogAsync(log);

                await Clients.Caller.SendAsync("ReceiveProcessingResult", new { Detections = detections, ExtractedText = extractedText });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing frame for ConnectionId {ConnectionId}", Context.ConnectionId);
                await Clients.Caller.SendAsync("ReceiveError", $"Server Error: {ex.Message}");
            }
        }
    }
}