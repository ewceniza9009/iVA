using OpenCvSharp;
using System;
using System.Threading.Tasks;
using Tesseract;

namespace iVA.Services
{
    public class OCRService
    {
        private readonly TesseractEngine _engine;
        private readonly object _engineLock = new object();

        public OCRService()
        {
            _engine = new TesseractEngine(AppContext.BaseDirectory + "/tessdata", "eng", EngineMode.Default);
        }

        public Task<string> ExtractTextAsync(byte[] imageBytes)
        {
            lock (_engineLock)
            {
                using var mat = Cv2.ImDecode(imageBytes, ImreadModes.Grayscale);
                Cv2.Threshold(mat, mat, 0, 255, ThresholdTypes.Binary | ThresholdTypes.Otsu);

                Cv2.ImEncode(".png", mat, out byte[] processedImageBytes);
                using var pix = Pix.LoadFromMemory(imageBytes);
                using var page = _engine.Process(pix);
                var text = page.GetText().Trim();

                return Task.FromResult(text);
            }
        }
    }
}