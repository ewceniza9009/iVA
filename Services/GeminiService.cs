using GenerativeAI;
using GenerativeAI.Types;          
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;          
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace iVA.Services
{
    public class GeminiService
    {
        private readonly GenerativeModel _model;
        private readonly ILogger<GeminiService> _logger;
        private readonly string _apiKey;

        public GeminiService(IConfiguration configuration, ILogger<GeminiService> logger)
        {
            _apiKey = configuration["Gemini:ApiKey"];
            _model = new GenerativeModel(_apiKey, model: "gemini-2.5-flash-preview-05-20");
            _logger = logger;
        }

        public async Task<string> GenerateSceneDescriptionAsync(byte[] imageBytes, List<Detection> detections, string ocrText)
        {
            if (string.IsNullOrEmpty(_apiKey) || _apiKey.Contains("YOUR_GEMINI_API_KEY"))
            {
                return "Gemini API key not configured.";
            }

            if (imageBytes == null || imageBytes.Length == 0)
            {
                return "No image data provided for analysis.";
            }

            var objectList = string.Join(", ", detections.Select(d => d.ClassName).Distinct());
            
            var prompt = @$"Analyze this scene based on the provided image.
- **Summary:** Briefly describe what is happening in the scene.
- **Key Objects:** The following objects were detected: {objectList}. Describe their appearance and relationship to each other.
- **Text in Scene:** The following text was found: '{ocrText}'. What is its likely purpose or context?
- **Inference:** What can you infer from the scene? Is there a potential story, activity, or hazard?
Provide the output as a concise, well-formatted analysis.";

            try
            {
                var parts = new List<Part>
                {
                    new Part { Text = prompt },

                    new Part { InlineData = new Blob { MimeType = "image/jpeg", Data = Convert.ToBase64String(imageBytes) } }
                };

                var content = new Content
                {
                    Parts = parts
                };

                var request = new GenerateContentRequest
                {
                    Contents = new List<Content> { content }
                };

                var response = await _model.GenerateContentAsync(request);
                return response.Text();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while calling the Gemini API with image data.");
                return $"Gemini API Error: {ex.Message}";
            }
        }
    }
}