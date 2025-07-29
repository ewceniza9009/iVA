using Tesseract;

namespace iVA.Services
{
    public class OCRService
    {
        private readonly TesseractEngine _engine;

        public OCRService()
        {
            _engine = new TesseractEngine(AppContext.BaseDirectory + "/tessdata", "eng", EngineMode.Default);
        }

        public Task<string> ExtractTextAsync(byte[] imageBytes)
        {
            using var pix = Pix.LoadFromMemory(imageBytes);
            using var page = _engine.Process(pix);
            var text = page.GetText().Trim();

            return Task.FromResult(text);
        }
    }
}