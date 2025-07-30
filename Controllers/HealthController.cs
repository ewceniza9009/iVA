using iVA.Services;
using Microsoft.AspNetCore.Mvc;

namespace iVA.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly ApplicationStatusService _statusService;

        public HealthController(ApplicationStatusService statusService)
        {
            _statusService = statusService;
        }

        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            if (_statusService.IsReady)
            {
                return Ok(new { status = "ready" });
            }
            else
            {
                return StatusCode(503, new { status = "initializing" });
            }
        }
    }
}