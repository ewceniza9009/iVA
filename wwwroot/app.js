document.addEventListener('DOMContentLoaded', () => {
    const objectsEl = document.getElementById('objectCounts');
    const textEl = document.getElementById('extractedText');
    const logsContainer = document.getElementById('logsContainer');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const lightIcon = document.getElementById('theme-toggle-light-icon');
    const darkIcon = document.getElementById('theme-toggle-dark-icon');

    const liveCameraTabBtn = document.getElementById('liveCameraTabBtn');
    const videoFileTabBtn = document.getElementById('videoFileTabBtn');
    const liveCameraContent = document.getElementById('liveCameraContent');
    const videoFileContent = document.getElementById('videoFileContent');

    const cameraVideoFeed = document.getElementById('videoFeed');
    const cameraCanvas = document.getElementById('canvas');
    const cameraPlayBtn = document.getElementById('playBtn');
    const cameraPauseBtn = document.getElementById('pauseBtn');

    const videoFileFeed = document.getElementById('videoFeedAlt');
    const videoFileCanvas = document.getElementById('canvasAlt');
    const videoFileInput = document.getElementById('videoFileInput');
    const videoFilePlayBtn = document.getElementById('playVideoFileBtn');
    const videoFilePauseBtn = document.getElementById('pauseVideoFileBtn');

    const authModal = document.getElementById('auth-modal');
    const mainContent = document.getElementById('main-content');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
    const authErrorMessage = document.getElementById('auth-error-message');
    const logoutBtn = document.getElementById('logout-btn');
    const userDisplay = document.getElementById('user-display');
    const usernameDisplay = document.getElementById('username-display');

    let currentActiveVideo = null;
    let currentActiveCanvas = null;
    let processingIntervalId = null;
    let currentCameraStream = null;
    let activeTab = 'camera';

    const loadingOverlay = document.getElementById('loading-overlay');

    const PROCESS_API_URL = '/api/videoprocessing/process-frame';
    const LOGS_API_URL = '/api/logs';
    const AUTH_LOGIN_URL = '/api/auth/login';
    const AUTH_REGISTER_URL = '/api/auth/register';

    let authToken = localStorage.getItem('authToken');
    let username = localStorage.getItem('username');

    logsContainer.addEventListener('click', (e) => {
        if (e.target && e.target.matches('.toggle-description-btn')) {
            const button = e.target;
            const detailsDiv = button.parentElement.querySelector('.description-details');
            const ellipsisSpan = button.parentElement.querySelector('.ellipsis-indicator');

            if (detailsDiv) {
                detailsDiv.classList.toggle('hidden');

                if (ellipsisSpan) {
                    ellipsisSpan.classList.toggle('hidden');
                }

                if (detailsDiv.classList.contains('hidden')) {
                    button.textContent = 'Show more...';
                } else {
                    button.textContent = 'Show less';
                }
            }
        }
    });

    const authenticatedFetch = async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            logout();
        }
        return response;
    };

    function updateAuthState(token, uname) {
        if (token && uname) {
            authToken = token;
            username = uname;
            localStorage.setItem('authToken', token);
            localStorage.setItem('username', uname);
            authModal.classList.add('hidden');
            mainContent.classList.remove('opacity-0');
            userDisplay.classList.remove('hidden');
            userDisplay.classList.add('flex');
            usernameDisplay.textContent = `Welcome, ${username}`;
            initialize();
        } else {
            authToken = null;
            username = null;
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            authModal.classList.remove('hidden');
            mainContent.classList.add('opacity-0');
            userDisplay.classList.add('hidden');
            stopAllVideoSources();
        }
    }

    function logout() {
        updateAuthState(null, null);
    }

    toggleAuthModeBtn.addEventListener('click', () => {
        loginForm.classList.toggle('hidden');
        registerForm.classList.toggle('hidden');
        document.getElementById('auth-title').textContent = loginForm.classList.contains('hidden') ? 'Register' : 'Login';
        document.getElementById('auth-subtitle').textContent = loginForm.classList.contains('hidden') ? 'Create a new iVA account.' : 'Welcome back to iVA.';
        document.getElementById('login-prompt').classList.toggle('hidden');
        document.getElementById('register-prompt').classList.toggle('hidden');
        document.getElementById('toggle-to-register').classList.toggle('hidden');
        document.getElementById('toggle-to-login').classList.toggle('hidden');
        authErrorMessage.classList.add('hidden');
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const uname = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        try {
            const response = await fetch(AUTH_LOGIN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: uname, password })
            });
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || 'Login failed');
            }
            const data = await response.json();
            updateAuthState(data.token, uname);
        } catch (error) {
            authErrorMessage.textContent = error.message;
            authErrorMessage.classList.remove('hidden');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const uname = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        try {
            const response = await fetch(AUTH_REGISTER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: uname, password })
            });
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || 'Registration failed');
            }
            toggleAuthModeBtn.click();
            document.getElementById('login-username').value = uname;
            document.getElementById('login-password').value = '';
            authErrorMessage.textContent = 'Registration successful! Please log in.';
            authErrorMessage.classList.remove('hidden');
            authErrorMessage.classList.remove('bg-rose-500/20', 'text-rose-500');
            authErrorMessage.classList.add('bg-green-500/20', 'text-green-500');

        } catch (error) {
            authErrorMessage.textContent = error.message;
            authErrorMessage.classList.remove('hidden');
            authErrorMessage.classList.remove('bg-green-500/20', 'text-green-500');
            authErrorMessage.classList.add('bg-rose-500/20', 'text-rose-500');
        }
    });

    logoutBtn.addEventListener('click', logout);


    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
            lightIcon.classList.add('hidden');
            darkIcon.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
        }

        if (activeTab === 'camera') {
            updateTabButtonStyles(liveCameraTabBtn, videoFileTabBtn, theme);
        } else {
            updateTabButtonStyles(videoFileTabBtn, liveCameraTabBtn, theme);
        }

        if (currentActiveCanvas) {
            currentActiveCanvas.getContext('2d').clearRect(0, 0, currentActiveCanvas.width, currentActiveCanvas.height);
        }
    };

    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        const newTheme = isDark ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    function drawBoundingBoxes(detections) {
        if (!currentActiveCanvas || !currentActiveVideo) return;

        const ctx = currentActiveCanvas.getContext('2d');
        ctx.clearRect(0, 0, currentActiveCanvas.width, currentActiveCanvas.height);
        if (!detections || detections.length === 0) return;

        currentActiveCanvas.width = currentActiveVideo.videoWidth;
        currentActiveCanvas.height = currentActiveVideo.videoHeight;

        detections.forEach(det => {
            const { x, y, width, height } = det.boundingBox;
            const isDark = document.documentElement.classList.contains('dark');
            const strokeColor = isDark ? '#2dd4bf' : '#0d9488';
            const fillColor = isDark ? '#2dd4bf' : '#0d9488';
            const textColor = '#ffffff';

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            const text = `${det.className} (${det.confidence.toFixed(2)})`;
            ctx.font = "14px Inter, sans-serif";
            const textWidth = ctx.measureText(text).width;

            ctx.fillStyle = fillColor;
            ctx.fillRect(x, y - 20, textWidth + 10, 20);
            ctx.fillStyle = textColor;
            ctx.fillText(text, x + 5, y - 5);
        });
    }

    async function processFrame() {
        if (!currentActiveVideo || currentActiveVideo.paused || currentActiveVideo.readyState < currentActiveVideo.HAVE_CURRENT_DATA) return;
        if (!authToken) return;                         

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = currentActiveVideo.videoWidth;
        tempCanvas.height = currentActiveVideo.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(currentActiveVideo, 0, 0, tempCanvas.width, tempCanvas.height);
        const imageBase64 = tempCanvas.toDataURL('image/jpeg').split(',')[1];

        try {
            const response = await authenticatedFetch(PROCESS_API_URL, {
                method: 'POST',
                body: JSON.stringify({ imageBase64 })
            });
            if (!response.ok) return;

            const result = await response.json();

            const objectCountsMap = {};
            if (result.detections && result.detections.length > 0) {
                result.detections.forEach(det => {
                    const className = det.className;
                    objectCountsMap[className] = (objectCountsMap[className] || 0) + 1;
                });

                const formattedCounts = Object.entries(objectCountsMap)
                    .map(([className, count]) => `${count} ${className}${count > 1 ? 's' : ''}`)
                    .join(', ');
                objectsEl.textContent = formattedCounts;
            } else {
                objectsEl.textContent = 'No objects detected.';
            }

            textEl.textContent = result.extractedText || 'No text detected.';
            drawBoundingBoxes(result.detections);
        } catch (error) {
            console.error('Failed to process frame:', error);
        }
    }

    function markdownToHtml(markdownText) {
        if (!markdownText) return '';
        let html = markdownText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/^- (.*)/gm, '<li>$1</li>');
        if (html.includes('<li>')) {
            html = `<ul>${html}</ul>`;
        }
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    function createLogCard(log) {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const text = log.extractedText || "None";
        let formattedObjects = "None";

        if (log.objectsDetected && log.objectsDetected !== "None" && log.objectsDetected.trim() !== "") {
            const individualObjects = log.objectsDetected.split(', ').map(s => s.trim()).filter(s => s.length > 0);
            const objectCountsMap = {};
            individualObjects.forEach(obj => {
                objectCountsMap[obj] = (objectCountsMap[obj] || 0) + 1;
            });
            formattedObjects = Object.entries(objectCountsMap)
                .map(([className, count]) => `${count} ${className}${count > 1 ? 's' : ''}`)
                .join(', ');
        }

        const fullDescription = log.sceneDescription || '';
        const parts = fullDescription.split(/\n\s*\n/);                                     
        const summaryText = parts[0] || '';
        const detailText = parts.length > 1 ? parts.slice(1).join('\n\n') : '';

        const summaryHtml = markdownToHtml(summaryText);
        let descriptionContent;

        if (detailText) {
            const detailHtml = markdownToHtml(detailText);
            descriptionContent = `
                <div class="description-text">
                    <p class="inline">${summaryHtml}</p><span class="ellipsis-indicator">...</span>
                    <div class="description-details hidden" style="margin-top: 0.75rem;">${detailHtml}</div>
                </div>
                <button class="toggle-description-btn text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline focus:outline-none mt-2">Show more...</button>
            `;
        } else {
            descriptionContent = `<div class="description-text"><p>${summaryHtml}</p></div>`;
        }

        return `
        <div class="p-4 rounded-lg animate-fade-in glass-panel bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700" data-log-id="${log.id}">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">${timestamp}</p>
            <div class="description-wrapper mb-3">${descriptionContent}</div>
            <details class="text-xs">
                <summary class="list-none cursor-pointer text-teal-600 dark:text-teal-400 flex justify-between items-center font-medium">
                    Details
                    <svg class="w-4 h-4 transition-transform transform details-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </summary>
                <div class="mt-2 pt-2 border-t border-gray-300 dark:border-slate-600 space-y-1">
                    <p><strong class="font-medium text-gray-800 dark:text-gray-400">Objects:</strong> ${formattedObjects}</p>
                    <p><strong class="font-medium text-gray-800 dark:text-gray-400">Text:</strong> ${text}</p>
                </div>
            </details>
        </div>
        `;
    }

    async function fetchAndRenderLogs() {
        if (!authToken) return;                         
        try {
            const response = await authenticatedFetch(LOGS_API_URL);
            if (!response.ok) return;
            const logs = await response.json();

            if (!logs || logs.length === 0) {
                logsContainer.innerHTML = '<p class="text-center text-gray-600 dark:text-gray-500">History will appear here once processing starts.</p>';
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

    function stopAllVideoSources() {
        stopProcessing();

        if (currentCameraStream) {
            currentCameraStream.getTracks().forEach(track => track.stop());
            currentCameraStream = null;
        }

        cameraVideoFeed.srcObject = null;
        cameraVideoFeed.removeAttribute('src');
        cameraVideoFeed.load();

        videoFileFeed.srcObject = null;
        videoFileFeed.removeAttribute('src');
        videoFileFeed.load();

        cameraCanvas.getContext('2d').clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);
        videoFileCanvas.getContext('2d').clearRect(0, 0, videoFileCanvas.width, videoFileCanvas.height);

        currentActiveVideo = null;
        currentActiveCanvas = null;
        console.log("All video sources and canvases cleared.");
    }

    function startProcessing() {
        if (processingIntervalId) return;

        if (!currentActiveVideo) {
            console.warn("No video source (camera or file) available to start processing.");
            objectsEl.textContent = 'No video source selected.';
            textEl.textContent = 'No video source selected.';
            return;
        }

        currentActiveVideo.play().catch(e => {
            console.error("Error attempting to play video:", e);
            objectsEl.textContent = 'Autoplay blocked. Click play again.';
            textEl.textContent = 'Autoplay blocked. Click play again.';
        });

        processingIntervalId = setInterval(processFrame, 500);

        if (activeTab === 'camera') {
            cameraPlayBtn.classList.add('opacity-50', 'cursor-not-allowed');
            cameraPauseBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            videoFilePlayBtn.classList.add('opacity-50', 'cursor-not-allowed');
            videoFilePauseBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }

        fetchAndRenderLogs();
        setInterval(fetchAndRenderLogs, 5000);
    }

    function stopProcessing() {
        if (!processingIntervalId) return;

        if (currentActiveVideo) {
            currentActiveVideo.pause();
        }
        clearInterval(processingIntervalId);
        processingIntervalId = null;

        if (activeTab === 'camera') {
            cameraPlayBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            cameraPauseBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            videoFilePlayBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            videoFilePauseBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }

        objectsEl.textContent = 'Paused';
        textEl.textContent = 'Paused';
    }

    async function initializeCamera() {
        stopAllVideoSources();
        currentActiveVideo = cameraVideoFeed;
        currentActiveCanvas = cameraCanvas;
        activeTab = 'camera';
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 } }
            });
            cameraVideoFeed.srcObject = stream;
            currentCameraStream = stream;
            console.log("Camera initialized and set as source.");
            cameraPlayBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            cameraPauseBtn.classList.add('opacity-50', 'cursor-not-allowed');
            videoFilePlayBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            videoFilePauseBtn.classList.add('opacity-50', 'cursor-not-allowed');
            objectsEl.textContent = 'Camera ready. Click Play to start.';
            textEl.textContent = 'Camera ready. Click Play to start.';
        } catch (err) {
            console.error("Error accessing camera:", err);
            liveCameraContent.querySelector('.bg-black').innerHTML = `
            <p class="text-rose-500 text-center p-8">
                Camera access denied or not available. Please ensure camera permissions are granted or select a video file.
            </p>`;
            cameraPlayBtn.classList.add('opacity-50', 'cursor-not-allowed');
            objectsEl.textContent = 'Camera unavailable.';
            textEl.textContent = 'Camera unavailable.';
        }
    }

    function prepareVideoFile() {
        stopAllVideoSources();
        currentActiveVideo = videoFileFeed;
        currentActiveCanvas = videoFileCanvas;
        activeTab = 'videoFile';
        videoFilePlayBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        videoFilePauseBtn.classList.add('opacity-50', 'cursor-not-allowed');
        cameraPlayBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        cameraPauseBtn.classList.add('opacity-50', 'cursor-not-allowed');
        console.log("Prepared for video file input.");
    }

    videoFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            stopProcessing();
            stopAllVideoSources();

            currentActiveVideo = videoFileFeed;
            currentActiveCanvas = videoFileCanvas;
            activeTab = 'videoFile';

            const fileURL = URL.createObjectURL(file);
            videoFileFeed.src = fileURL;
            videoFileFeed.loop = true;
            videoFileFeed.muted = true;
            videoFileFeed.load();

            videoFileFeed.onloadeddata = () => {
                console.log("Video file loaded into videoFileFeed:", file.name);
                videoFilePlayBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            };

            videoFileFeed.onended = () => {
                if (activeTab === 'videoFile' && !videoFileFeed.loop) {
                    stopProcessing();
                    console.log("Video file ended, processing stopped.");
                }
            };

        } else {
            console.log("Video file selection cancelled.");
            videoFileFeed.removeAttribute('src');
            videoFileFeed.load();
            objectsEl.textContent = 'No video file selected.';
            textEl.textContent = 'No video file selected.';
            videoFilePlayBtn.classList.add('opacity-50', 'cursor-not-allowed');
            if (activeTab === 'videoFile') {
                videoFilePlayBtn.classList.add('opacity-50', 'cursor-not-allowed');
                videoFilePauseBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    });

    function updateTabButtonStyles(activeBtn, inactiveBtn, currentTheme) {
        [activeBtn, inactiveBtn].forEach(btn => {
            btn.classList.remove('bg-teal-500', 'text-white', 'shadow-md',
                'bg-teal-600',
                'text-gray-700', 'hover:bg-teal-50',
                'text-gray-300', 'hover:bg-slate-700');
        });

        activeBtn.classList.add('bg-teal-500', 'text-white', 'shadow-md');
        if (currentTheme === 'dark') {
            activeBtn.classList.remove('bg-teal-500');
            activeBtn.classList.add('bg-teal-600');
        }

        inactiveBtn.classList.add('text-gray-700', 'hover:bg-teal-50');
        if (currentTheme === 'dark') {
            inactiveBtn.classList.remove('text-gray-700', 'hover:bg-teal-50');
            inactiveBtn.classList.add('text-gray-300', 'hover:bg-slate-700');
        }
    }


    liveCameraTabBtn.addEventListener('click', () => {
        if (activeTab === 'camera') return;
        stopProcessing();
        stopAllVideoSources();
        liveCameraContent.classList.remove('hidden');
        videoFileContent.classList.add('hidden');

        updateTabButtonStyles(liveCameraTabBtn, videoFileTabBtn, localStorage.getItem('theme') || 'light');

        initializeCamera();
        objectsEl.textContent = 'Ready for camera feed.';
        textEl.textContent = 'Ready for camera feed.';
    });

    videoFileTabBtn.addEventListener('click', () => {
        if (activeTab === 'videoFile') return;
        stopProcessing();
        stopAllVideoSources();
        videoFileContent.classList.remove('hidden');
        liveCameraContent.classList.add('hidden');

        updateTabButtonStyles(videoFileTabBtn, liveCameraTabBtn, localStorage.getItem('theme') || 'light');

        prepareVideoFile();
        objectsEl.textContent = 'Select a video file.';
        textEl.textContent = 'Select a video file.';
    });

    cameraPlayBtn.addEventListener('click', startProcessing);
    cameraPauseBtn.addEventListener('click', stopProcessing);
    videoFilePlayBtn.addEventListener('click', startProcessing);
    videoFilePauseBtn.addEventListener('click', stopProcessing);


    async function initialize() {
        if (!authToken) return;
        await fetchAndRenderLogs();

        liveCameraTabBtn.click();

        initializeCamera();
    }

    function checkBackendStatus() {
        console.log("Checking backend status...");
        const statusInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/health/status');

                if (response.ok) {
                    console.log("Backend is ready. Hiding loader.");
                    clearInterval(statusInterval);

                    loadingOverlay.classList.add('fade-out');
                    setTimeout(() => {
                        loadingOverlay.style.display = 'none';
                        updateAuthState(authToken, username);
                    }, 500);
                }
            } catch (error) {
                console.log("Backend not reachable yet, retrying...");
            }
        }, 2000);
    }

    checkBackendStatus();
});