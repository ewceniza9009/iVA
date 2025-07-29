using iVA.Models;
using Microsoft.EntityFrameworkCore;

namespace iVA.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<DetectionLog> DetectionLogs { get; set; }
        public DbSet<User> Users { get; set; }
    }
}