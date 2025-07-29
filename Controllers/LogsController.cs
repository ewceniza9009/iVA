using iVA.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace iVA.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
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
            var logs = await _context.DetectionLogs
                .OrderByDescending(l => l.Timestamp)
                .Take(15)       
                .ToListAsync();
            return Ok(logs);
        }
    }
}