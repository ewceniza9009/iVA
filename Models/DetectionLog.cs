using System;
using System.ComponentModel.DataAnnotations;

namespace iVA.Models
{
    public class DetectionLog
    {
        [Key]
        public int Id { get; set; }

        public DateTime Timestamp { get; set; }

        public string? ObjectsDetected { get; set; }     

        public int ObjectCount { get; set; }

        public string? ExtractedText { get; set; }

        public string? SceneDescription { get; set; }    
    }
}