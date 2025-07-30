using iVA.Services;

public class ModelLoadingService : IHostedService
{
    private readonly ILogger<ModelLoadingService> _logger;
    private readonly ApplicationStatusService _statusService;

    public ModelLoadingService(
        ObjectDetectionService detectionService,
        OCRService ocrService,
        ApplicationStatusService statusService,   
        ILogger<ModelLoadingService> logger)
    {
        _logger = logger;
        _statusService = statusService;   
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("All models have been loaded.");

        _statusService.IsReady = true;

        _logger.LogInformation("Application is now ready.");
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}