using iVA.Models;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using OpenCvSharp;
using OpenCvSharp.Dnn;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

namespace iVA.Services
{
    public class SerializableRect
    {
        public int X { get; set; }
        public int Y { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
    }

    public class Detection
    {
        public string ClassName { get; set; }
        public double Confidence { get; set; }
        public SerializableRect BoundingBox { get; set; }
    }

    public class ObjectDetectionService
    {
        private readonly InferenceSession _session;
        private readonly string[] _classNames =
        {
            "person",
            "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
            "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
            "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe",
            "backpack", "umbrella", "handbag", "tie", "suitcase",
            "frisbee", "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
            "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl",
            "banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake",
            "chair", "couch", "potted plant", "bed", "dining table", "toilet",
            "tv", "laptop", "mouse", "remote", "keyboard", "cell phone",
            "microwave", "oven", "toaster", "sink", "refrigerator",
            "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
        };

        public ObjectDetectionService()
        {
            var sessionOptions = new Microsoft.ML.OnnxRuntime.SessionOptions
            {
                GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL
            };

            _session = new InferenceSession(
                AppContext.BaseDirectory + "/nets/object_detector.onnx",
                sessionOptions);
        }

        public Task<List<Detection>> DetectObjectsAsync(byte[] imageBytes)
        {
            using var mat = Cv2.ImDecode(imageBytes, ImreadModes.Color);
            var inputTensor = PrepareInput(mat);
            var inputs = new List<NamedOnnxValue> { NamedOnnxValue.CreateFromTensor("images", inputTensor) };
            using var results = _session.Run(inputs);
            var output = results.FirstOrDefault()?.AsTensor<float>();
            var detections = PostProcess(output, mat.Size());
            return Task.FromResult(detections);
        }

        private DenseTensor<float> PrepareInput(Mat image)
        {
            Mat blob = CvDnn.BlobFromImage(image, 1.0 / 255.0, new Size(640, 640), swapRB: true, crop: false);
            var data = new float[1 * 3 * 640 * 640];
            Marshal.Copy(blob.Data, data, 0, data.Length);
            var tensor = new DenseTensor<float>(data, new[] { 1, 3, 640, 640 });
            blob.Dispose();
            return tensor;
        }

        private List<Detection> PostProcess(Tensor<float> output, Size originalSize, float confidenceThreshold = 0.5f, float nmsThreshold = 0.4f)
        {
            var detections = new List<Detection>();
            if (output == null) return detections;

            var boxes = new List<Rect>();
            var confidences = new List<float>();
            var classIds = new List<int>();

            var outputData = output.ToArray();
            int proposalLength = output.Dimensions[1];
            int numProposals = output.Dimensions[2];

            float xFactor = (float)originalSize.Width / 640;
            float yFactor = (float)originalSize.Height / 640;

            for (int i = 0; i < numProposals; i++)
            {
                float maxScore = 0f;
                int currentClassId = -1;
                for (int j = 4; j < proposalLength; j++)
                {
                    float score = outputData[j * numProposals + i];
                    if (score > maxScore)
                    {
                        maxScore = score;
                        currentClassId = j - 4;
                    }
                }

                if (maxScore > confidenceThreshold)
                {
                    confidences.Add(maxScore);
                    classIds.Add(currentClassId);

                    float cx = outputData[0 * numProposals + i] * 640;
                    float cy = outputData[1 * numProposals + i] * 640;
                    float w = outputData[2 * numProposals + i] * 640;
                    float h = outputData[3 * numProposals + i] * 640;

                    int left = (int)((cx - 0.5 * w) * xFactor);
                    int top = (int)((cy - 0.5 * h) * yFactor);
                    int width = (int)(w * xFactor);
                    int height = (int)(h * yFactor);

                    boxes.Add(new Rect(left, top, width, height));
                }
            }

            CvDnn.NMSBoxes(boxes, confidences, confidenceThreshold, nmsThreshold, out int[] indices);

            foreach (int index in indices)
            {
                var box = boxes[index];
                detections.Add(new Detection
                {
                    ClassName = _classNames[classIds[index]],
                    Confidence = confidences[index],
                    BoundingBox = new SerializableRect { X = box.X, Y = box.Y, Width = box.Width, Height = box.Height }
                });
            }
            return detections;
        }
    }
}