using GenerativeAI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
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

            _model = new GenerativeModel(_apiKey, model: "gemini-1.5-flash-latest");
            _logger = logger;
        }

        public async Task<string> GenerateSceneDescriptionAsync(List<Detection> detections, string ocrText)
        {
            if (string.IsNullOrEmpty(_apiKey) || _apiKey.Contains("YOUR_GEMINI_API_KEY"))
            {
                return "Gemini API key not configured.";
            }

            var objectList = string.Join(", ", detections.Select(d => d.ClassName).Distinct());
            var prompt = $"Briefly describe a scene containing these objects: {objectList}.";
            if (!string.IsNullOrWhiteSpace(ocrText))
            {
                prompt += $" The scene also includes the following text: '{ocrText}'.";
            }

            try
            {
                var response = await _model.GenerateContentAsync(prompt);
                return response.Text();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while calling the Gemini API.");
                return $"Gemini API Error: {ex.Message}";
            }
        }
    }
}