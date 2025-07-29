document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('videoFeed');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const objectsEl = document.getElementById('objectCounts');
    const textEl = document.getElementById('extractedText');
    const logsContainer = document.getElementById('logsContainer');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const lightIcon = document.getElementById('theme-toggle-light-icon');
    const darkIcon = document.getElementById('theme-toggle-dark-icon');

    let processingIntervalId = null;
    const PROCESS_API_URL = '/api/videoprocessing/process-frame';
    const LOGS_API_URL = '/api/logs';

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            lightIcon.classList.add('hidden');
            darkIcon.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
        }
    };

    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        const newTheme = isDark ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    function drawBoundingBoxes(detections) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!detections || detections.length === 0) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        detections.forEach(det => {
            const { x, y, width, height } = det.boundingBox;
            const isDark = document.documentElement.classList.contains('dark');
            ctx.strokeStyle = isDark ? '#22d3ee' : '#0891b2';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            const text = `${det.className} (${det.confidence.toFixed(2)})`;
            ctx.font = "14px Inter, sans-serif";
            const textWidth = ctx.measureText(text).width;

            ctx.fillStyle = isDark ? '#22d3ee' : '#0891b2';
            ctx.fillRect(x, y - 20, textWidth + 10, 20);
            ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
            ctx.fillText(text, x + 5, y - 5);
        });
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
            const response = await fetch(PROCESS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64 })
            });
            if (!response.ok) return;

            const result = await response.json();
            objectsEl.textContent = result.detections.length > 0 ? `${result.detections.length} objects found.` : 'No objects detected.';
            textEl.textContent = result.extractedText || 'No text detected.';
            drawBoundingBoxes(result.detections);
        } catch (error) {
            console.error('Failed to process frame:', error);
        }
    }

    // Function to convert Markdown-like text to HTML
    function markdownToHtml(markdownText) {
        if (!markdownText) return '';

        // Replace bold **text** with <strong>text</strong>
        let html = markdownText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Replace bullet points (if any, based on Gemini's output style, which uses '- ')
        html = html.replace(/^- (.*)/gm, '<li>$1</li>'); // For unordered lists
        if (html.includes('<li>')) {
            html = `<ul>${html}</ul>`;
        }

        // Replace newlines with <br> for simple line breaks
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    function createLogCard(log) {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const descriptionHtml = markdownToHtml(log.sceneDescription); // Convert Markdown to HTML
        const objects = log.objectsDetected || "None";
        const text = log.extractedText || "None";

        return `
        <div class="p-4 rounded-lg bg-white/50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 animate-fade-in" data-log-id="${log.id}">
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">${timestamp}</p>
            <p class="mb-3 text-sm">${descriptionHtml}</p> <details class="text-xs">
                <summary class="cursor-pointer text-cyan-600 dark:text-cyan-400">Details</summary>
                <div class="mt-2 pt-2 border-t border-slate-300 dark:border-slate-600 space-y-1">
                    <p><strong class="font-medium">Objects:</strong> ${objects}</p>
                    <p><strong class="font-medium">Text:</strong> ${text}</p>
                </div>
            </details>
        </div>
        `;
    }

    async function fetchAndRenderLogs() {
        try {
            const response = await fetch(LOGS_API_URL);
            if (!response.ok) return;
            const logs = await response.json();

            if (!logs || logs.length === 0) {
                logsContainer.innerHTML = '<p class="text-center text-slate-500 text-sm">History will appear here once processing starts.</p>';
                return;
            }

            const firstCard = logsContainer.querySelector('div[data-log-id]');
            let latestIdOnPage = 0;
            if (firstCard) {
                latestIdOnPage = parseInt(firstCard.dataset.logId, 10);
            } else {
                logsContainer.innerHTML = '';
            }

            const newLogs = logs.filter(log => log.id > latestIdOnPage);

            newLogs.reverse().forEach(log => {
                const cardHTML = createLogCard(log);
                logsContainer.insertAdjacentHTML('afterbegin', cardHTML);
            });

        } catch (error) {
            console.error('Failed to fetch logs:', error);
        }
    }

    function startProcessing() {
        if (processingIntervalId) return;
        video.play();
        processingIntervalId = setInterval(processFrame, 500);
        playBtn.classList.add('opacity-50', 'cursor-not-allowed');
        pauseBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        fetchAndRenderLogs();
        setInterval(fetchAndRenderLogs, 5000);
    }

    function stopProcessing() {
        if (!processingIntervalId) return;
        video.pause();
        clearInterval(processingIntervalId);
        processingIntervalId = null;
        playBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        pauseBtn.classList.add('opacity-50', 'cursor-not-allowed');
        objectsEl.textContent = 'Paused';
        textEl.textContent = 'Paused';
    }

    async function initialize() {
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);

        await fetchAndRenderLogs();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 } }
            });
            video.srcObject = stream;
        } catch (err) {
            console.error("Error accessing camera:", err);
            document.querySelector('.lg\\:col-span-2').innerHTML = '<p class="text-rose-500 text-center p-8">Camera access denied or not available.</p>';
        }
    }

    playBtn.addEventListener('click', startProcessing);
    pauseBtn.addEventListener('click', stopProcessing);

    initialize();
});