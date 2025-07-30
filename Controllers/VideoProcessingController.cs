using iVA.Models;
using iVA.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace iVA.Controllers
{
    public class FrameData
    {
        public string? ImageBase64 { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Secure this controller
    public class VideoProcessingController : ControllerBase
    {
        private readonly ObjectDetectionService _detectionService;
        private readonly OCRService _ocrService;
        private readonly LogFileWriterService _logWriter;

        public VideoProcessingController(
            ObjectDetectionService detectionService,
            OCRService ocrService,
            LogFileWriterService logWriter)
        {
            _detectionService = detectionService;
            _ocrService = ocrService;
            _logWriter = logWriter;
        }

        [HttpPost("process-frame")]
        public async Task<IActionResult> ProcessFrame([FromBody] FrameData frameData)
        {
            if (string.IsNullOrEmpty(frameData.ImageBase64))
            {
                return BadRequest("Image data is empty.");
            }

            // Get user ID from the token claims
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            var imageBytes = System.Convert.FromBase64String(frameData.ImageBase64);

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
                ImageBase64 = frameData.ImageBase64,
                UserId = userId // Associate with the current user
            };

            await _logWriter.WriteLogAsync(log);

            return Ok(new { Detections = detections, ExtractedText = extractedText });
        }
    }
}