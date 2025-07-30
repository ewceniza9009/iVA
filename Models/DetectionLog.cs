using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; // Required for NotMapped & ForeignKey

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

        // Foreign key for the User
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual User User { get; set; }


        // This property will be used for temporary logging but not saved to the database.
        [NotMapped]
        public string? ImageBase64 { get; set; }
    }
}