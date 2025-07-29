document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('videoFeed');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const sceneDescEl = document.getElementById('sceneDescription');
    const objectsEl = document.getElementById('objectCounts');
    const textEl = document.getElementById('extractedText');

    let processingIntervalId = null;
    const API_URL = '/api/videoprocessing/process-frame';

    function drawBoundingBoxes(detections) {
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        canvas.width = videoWidth;
        canvas.height = videoHeight;

        const xScale = canvas.clientWidth / videoWidth;
        const yScale = canvas.clientHeight / videoHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detections && detections.length > 0) {
            detections.forEach(det => {
                const scaledX = det.boundingBox.x * xScale;
                const scaledY = det.boundingBox.y * yScale;
                const scaledWidth = det.boundingBox.width * xScale;
                const scaledHeight = det.boundingBox.height * yScale;

                ctx.font = "14px sans-serif";

                ctx.strokeStyle = '#06b6d4';     
                ctx.lineWidth = 2;
                ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

                const text = `${det.className} (${det.confidence.toFixed(2)})`;
                const textWidth = ctx.measureText(text).width;

                ctx.fillStyle = '#06b6d4';     
                ctx.fillRect(scaledX, scaledY - 20, textWidth + 10, 20);

                ctx.fillStyle = '#ffffff';     
                ctx.fillText(text, scaledX + 5, scaledY - 5);
            });
        }
    }

    async function processFrame() {
        if (video.paused || video.readyState < video.HAVE_CURRENT_DATA) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        const imageBase64 = tempCanvas.toDataURL('image/jpeg').split(',')[1];

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: imageBase64 })
            });
            if (!response.ok) return;

            const result = await response.json();

            sceneDescEl.textContent = "Description is generated in the final log.";
            objectsEl.textContent = result.detections.length > 0 ? `${result.detections.length} objects found` : 'No objects detected.';
            textEl.textContent = result.extractedText || 'No text detected.';
            drawBoundingBoxes(result.detections);

        } catch (error) {
            console.error('Failed to process frame:', error);
        }
    }

    function startProcessing() {
        if (processingIntervalId) return;
        video.play();
        processingIntervalId = setInterval(processFrame, 500);
    }

    function stopProcessing() {
        video.pause();
        clearInterval(processingIntervalId);
        processingIntervalId = null;
    }

    playBtn.addEventListener('click', startProcessing);
    pauseBtn.addEventListener('click', stopProcessing);

    async function initialize() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 } }
            });
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                startProcessing();
            };
        } catch (err) {
            console.error("Error accessing camera:", err);
            sceneDescEl.textContent = "Camera access denied or not available.";
        }
    }

    initialize();
});