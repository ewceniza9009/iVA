using iVA.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace iVA.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Secure this controller
    public class LogsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LogsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetLatestLogs()
        {
            // Get user ID from the token claims
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            var logs = await _context.DetectionLogs
                .Where(l => l.UserId == userId) // Filter by user ID
                .OrderByDescending(l => l.Timestamp)
                .Take(15)
                .ToListAsync();
            return Ok(logs);
        }
    }
}