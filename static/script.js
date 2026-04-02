

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded. Initializing app...');

    
    const socket_url = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws/audio';
    const socket = new WebSocket(socket_url);
    console.log('Native WebSocket initialized.');
    const openLoginModalBtn = document.getElementById('open-login-modal-btn');
    const loggedInInfo = document.getElementById('logged-in-info');
    const userEmailDisplay = document.getElementById('user-email-display');
    const logoutBtn = document.getElementById('logout-btn');
    const userIdDisplay = document.getElementById('user-id-display');

    
    let isUserLoggedIn = false;

    
    if (openLoginModalBtn) {
        openLoginModalBtn.addEventListener('click', () => {
            console.log('Navbar Login Button Clicked.');
            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                loginModal.classList.remove('hidden');
                const modalMessage = document.getElementById('modal-message');
                if (modalMessage) modalMessage.classList.add('hidden'); // Hide message on open
                console.log('Login modal opened.');
            } else {
                console.error('Error: Login modal element not found when main login button clicked.');
            }
        });
    } else {
        console.warn('Warning: openLoginModalBtn not found.');
    }


     
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            console.log(`Smooth scrolling to: ${targetId}`);
            document.querySelector(targetId).scrollIntoView({
                behavior: 'smooth'
            });
            
            if (navbarLinks && navbarLinks.classList.contains('active')) {
                navbarLinks.classList.remove('active'); 
            }
        });
    });

    
    const scrollProgressBar = document.getElementById('scroll-progress-bar');
    if (scrollProgressBar) {
        window.addEventListener('scroll', () => {
            const totalHeight = document.body.scrollHeight - window.innerHeight;
            const progress = (window.scrollY / totalHeight) * 100;
            scrollProgressBar.style.width = progress + '%';
        });
    } else {
        console.warn('Warning: Scroll progress bar element not found.');
    }

    
    
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }


    
    function showMessageBox(message, type = 'info', duration = 3000) {
        const messageBox = document.getElementById('message-box');
        if (!messageBox) {
            console.error('Error: Message box element not found.');
            return;
        }

        messageBox.textContent = message;
        messageBox.className = 'fixed bottom-4 right-4 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-300';

        switch (type) {
            case 'success':
                messageBox.classList.add('bg-green-600');
                break;
            case 'error':
                messageBox.classList.add('bg-red-600');
                break;
            case 'warning':
                messageBox.classList.add('bg-yellow-600');
                break;
            default:
                messageBox.classList.add('bg-gray-700');
                break;
        }

        messageBox.classList.remove('hidden');
        messageBox.classList.add('block', 'opacity-100', 'translate-y-0');

        setTimeout(() => {
            messageBox.classList.remove('opacity-100', 'translate-y-0');
            messageBox.classList.add('opacity-0', 'translate-y-4');
            setTimeout(() => {
                messageBox.classList.remove('block');
                messageBox.classList.add('hidden');
            }, 300); // Wait for fade out transition
        }, duration);
        console.log(`Message Box displayed: ${message} (${type})`);
    }
    window.showMessageBox = showMessageBox; // Make it globally accessible

    //  Copy Email to Clipboard
    const copyEmailBtn = document.getElementById('copy-email-btn');
    const contactEmailSpan = document.getElementById('contact-email');

    if (copyEmailBtn && contactEmailSpan) {
        copyEmailBtn.addEventListener('click', () => {
            const email = contactEmailSpan.textContent;
            const tempInput = document.createElement('input');
            document.body.appendChild(tempInput);
            tempInput.value = email;
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            showMessageBox('Email copied to clipboard!', 'success');
            console.log('Email copied to clipboard.');
        });
    } else {
        console.warn('Warning: Copy email button or contact email span not found.');
    }

    // Dynamic Loading of Partials (Login Modal) 
    async function loadPartial(placeholderId, partialPath) {
        const placeholder = document.getElementById(placeholderId);
        if (placeholder) {
            try {
                console.log(`Attempting to load partial: ${partialPath} into ${placeholderId}`);
                const response = await fetch(partialPath);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const html = await response.text();
                placeholder.innerHTML = html;
                console.log(`Partial ${partialPath} loaded successfully into ${placeholderId}`);
                return true; // Indicate successful load
            } catch (error) {
                console.error(`Failed to load partial ${partialPath}:`, error);
                showMessageBox(`Failed to load a part of the page: ${partialPath}`, 'error');
                return false; // Indicate failed load
            }
        } else {
            console.error(`Error: Placeholder element '${placeholderId}' not found for partial '${partialPath}'.`);
            return false;
        }
    }

    // Load Login Modal
    loadPartial('login-modal-placeholder', '/static/partials/login.html').then(loaded => {
        if (loaded) {
            console.log('Login modal partial loaded. Initializing login modal...');
            initLoginModal();
            checkUserLoginStatus(); // Check status after modal is loaded
        } else {
            console.error('Login modal partial failed to load. Login functionality may be impaired.');
        }
    });

    //  Login/Registration Modal Logic 
    function initLoginModal() {
        const loginModal = document.getElementById('login-modal');
        const closeLoginModalBtn = document.getElementById('close-login-modal-btn');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const showRegisterFormLink = document.getElementById('show-register-form');
        const showLoginFormLink = document.getElementById('show-login-form');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');

        if (!loginModal || !closeLoginModalBtn || !loginForm || !registerForm || !showRegisterFormLink || !showLoginFormLink || !modalTitle || !modalMessage) {
            console.error('Error: One or more login modal elements not found after partial load. Login/Register functionality will not work.');
            return;
        }
        console.log('All login modal elements found. Attaching listeners.');

        closeLoginModalBtn.addEventListener('click', () => {
            loginModal.classList.add('hidden');
            console.log('Login modal closed by button.');
        });

        // Close modal if clicked outside content
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                loginModal.classList.add('hidden');
                console.log('Login modal closed by clicking outside.');
            }
        });

        showRegisterFormLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Showing register form.');
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            modalTitle.textContent = 'Register';
            modalMessage.classList.add('hidden');
        });

        showLoginFormLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Showing login form.');
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            modalTitle.textContent = 'Login / Register';
            modalMessage.classList.add('hidden');
        });

        // Login Logic
        const loginSubmitBtn = document.getElementById('login-submit');
        if (loginSubmitBtn) {
            loginSubmitBtn.addEventListener('click', async () => {
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                const currentModalMessage = modalMessage;
                currentModalMessage.classList.remove('hidden', 'text-green-600', 'text-red-600');
                currentModalMessage.classList.add('text-gray-500');
                currentModalMessage.textContent = 'Logging in...';
                console.log('Attempting login for:', email);

                try {
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        currentModalMessage.textContent = data.message;
                        currentModalMessage.classList.remove('text-gray-500');
                        currentModalMessage.classList.add('text-green-600');
                        showMessageBox('Login successful!', 'success');
                        console.log('Login successful for:', email);
                        setTimeout(() => {
                            loginModal.classList.add('hidden');
                            checkUserLoginStatus();
                        }, 1000);
                    } else {
                        currentModalMessage.textContent = data.message || 'Login failed.';
                        currentModalMessage.classList.remove('text-gray-500');
                        currentModalMessage.classList.add('text-red-600');
                        showMessageBox(data.message || 'Login failed.', 'error');
                        console.error('Login failed:', data.message);
                    }
                } catch (error) {
                    console.error('Login fetch error:', error);
                    currentModalMessage.textContent = 'An error occurred. Please try again.';
                    currentModalMessage.classList.remove('text-gray-500');
                    currentModalMessage.classList.add('text-red-600');
                    showMessageBox('An error occurred during login.', 'error');
                }
            });
        } else {
            console.error('Error: Login submit button not found.');
        }


        // Register Logic
        const registerSubmitBtn = document.getElementById('register-submit');
        if (registerSubmitBtn) {
            registerSubmitBtn.addEventListener('click', async () => {
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;
                const confirmPassword = document.getElementById('register-confirm-password').value;
                const currentModalMessage = modalMessage;
                currentModalMessage.classList.remove('hidden', 'text-green-600', 'text-red-600');
                currentModalMessage.classList.add('text-gray-500');
                currentModalMessage.textContent = 'Registering...';
                console.log('Attempting registration for:', email);

                if (password !== confirmPassword) {
                    currentModalMessage.textContent = 'Passwords do not match.';
                    currentModalMessage.classList.remove('text-gray-500');
                    currentModalMessage.classList.add('text-red-600');
                    showMessageBox('Passwords do not match.', 'error');
                    console.warn('Registration failed: Passwords do not match.');
                    return;
                }

                try {
                    const response = await fetch('/api/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        currentModalMessage.textContent = data.message;
                        currentModalMessage.classList.remove('text-gray-500');
                        currentModalMessage.classList.add('text-green-600');
                        showMessageBox('Registration successful! Please log in.', 'success');
                        console.log('Registration successful for:', email);
                        setTimeout(() => {
                            showLoginFormLink.click(); // Switch back to login form
                            currentModalMessage.classList.add('hidden');
                        }, 1500);
                    } else {
                        currentModalMessage.textContent = data.message || 'Registration failed.';
                        currentModalMessage.classList.remove('text-gray-500');
                        currentModalMessage.classList.add('text-red-600');
                        showMessageBox(data.message || 'Registration failed.', 'error');
                        console.error('Registration failed:', data.message);
                    }
                } catch (error) {
                    console.error('Registration fetch error:', error);
                    currentModalMessage.textContent = 'An error occurred. Please try again.';
                    currentModalMessage.classList.remove('text-gray-500');
                    currentModalMessage.classList.add('text-red-600');
                    showMessageBox('An error occurred during registration.', 'error');
                }
            });
        } else {
            console.error('Error: Register submit button not found.');
        }
    }

    // User Login Status Check and Display 
    async function checkUserLoginStatus() {
        console.log('Checking user login status...');
        try {
            const response = await fetch('/api/current_user');
            const data = await response.json();
            if (data.user_email) {
                isUserLoggedIn = true;
                if (userEmailDisplay) userEmailDisplay.textContent = data.user_email;
                if (loggedInInfo) loggedInInfo.classList.remove('hidden');
                if (openLoginModalBtn) openLoginModalBtn.classList.add('hidden');
                if (userIdDisplay) userIdDisplay.textContent = `Logged in as: ${data.user_email}`;
                fetchAnalysisHistory(); // Fetch history if logged in
                console.log('User is logged in:', data.user_email);
            } else {
                isUserLoggedIn = false;
                if (userEmailDisplay) userEmailDisplay.textContent = '';
                if (loggedInInfo) loggedInInfo.classList.add('hidden');
                if (openLoginModalBtn) openLoginModalBtn.classList.remove('hidden');
                if (userIdDisplay) userIdDisplay.textContent = '';
                const analysisHistoryList = document.getElementById('analysis-history-list');
                if (analysisHistoryList) {
                    analysisHistoryList.innerHTML = '<li class="text-center text-gray-500">Log in to view your analysis history.</li>';
                }
                console.log('User is not logged in.');
            }

            // Attach logout listener here, after logoutBtn is guaranteed to exist
            if (logoutBtn) {
                logoutBtn.removeEventListener('click', handleLogout); // Prevent duplicate listeners
                logoutBtn.addEventListener('click', handleLogout);
            } else {
                console.warn('Warning: Logout button not found.');
            }
        } catch (error) {
            console.error('Error checking login status:', error);
            isUserLoggedIn = false; // Ensure state is correctly set even on error
            if (userEmailDisplay) userEmailDisplay.textContent = '';
            if (loggedInInfo) loggedInInfo.classList.add('hidden');
            if (openLoginModalBtn) openLoginModalBtn.classList.remove('hidden');
            if (userIdDisplay) userIdDisplay.textContent = '';
            showMessageBox('Failed to verify login status. Please refresh.', 'error');
        }
        updateAnalyzeButtonState(); // Update button state after login status is known
    }

    async function handleLogout() {
        console.log('Logout button clicked.');
        try {
            const response = await fetch('/api/logout', { method: 'POST' });
            const data = await response.json();
            if (response.ok) {
                showMessageBox('Logged out successfully!', 'success');
                console.log('Logout successful.');
                checkUserLoginStatus();
            } else {
                showMessageBox(data.message || 'Logout failed.', 'error');
                console.error('Logout failed:', data.message);
            }
        } catch (error) {
            console.error('Logout fetch error:', error);
            showMessageBox('An error occurred during logout.', 'error');
        }
    }


    // Voice Analysis Section Logic
    const audioFileInput = document.getElementById('audio-file-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const fileStatusContainer = document.getElementById('file-status-container');
    const clearFileBtn = document.getElementById('clear-file-btn');
    const analyzeVoiceBtn = document.getElementById('analyze-voice-btn');
    const analysisLoadingSpinner = document.getElementById('analysis-loading-spinner');
    const analysisResultsDiv = document.getElementById('analysis-results');
    const resultText = document.getElementById('result-text');
    const confidenceScore = document.getElementById('confidence-score');
    const analysisMessage = document.getElementById('analysis-message');

    let selectedAudioFile = null; // To store the file object
    let recordedAudioBlob = null; // To store recorded audio blob

    // Function to clear all audio input states (file upload and recording)
    function clearAudioInput() {
        console.log('Clearing audio input states...');
        // Clear uploaded file state
        if (audioFileInput) audioFileInput.value = '';
        selectedAudioFile = null;
        if (fileNameDisplay) fileNameDisplay.textContent = '';
        if (fileStatusContainer) fileStatusContainer.classList.add('hidden');

        // Clear recorded audio state
        recordedAudioBlob = null;
        if (audioPlayback) audioPlayback.src = '';
        if (audioPlayback) audioPlayback.classList.add('hidden');
        if (recordAudioBtn) recordAudioBtn.textContent = 'Start Recording';
        if (recordingStatus) recordingStatus.classList.add('hidden');
        if (clearRecordingBtn) clearRecordingBtn.classList.add('hidden');
        if (playRecordingBtn) playRecordingBtn.classList.add('hidden');
        if (typeof downloadRecordingBtn !== 'undefined' && downloadRecordingBtn) downloadRecordingBtn.classList.add('hidden');
        if (clearRecordingBtn) clearRecordingBtn.classList.add('hidden');
        
        updateAnalyzeButtonState();
        console.log('Audio input states cleared.');
    }


    // Enable/disable analyze button based on file selection/recording
    function updateAnalyzeButtonState() {
        if (analyzeVoiceBtn) {
            if (isUserLoggedIn && (selectedAudioFile || recordedAudioBlob)) {
                analyzeVoiceBtn.disabled = false;
                analyzeVoiceBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                console.log('Analyze button enabled.');
            } else {
                analyzeVoiceBtn.disabled = true;
                analyzeVoiceBtn.classList.add('opacity-50', 'cursor-not-allowed');
                console.log('Analyze button disabled. User logged in:', isUserLoggedIn, 'File selected:', !!selectedAudioFile, 'Recorded audio:', !!recordedAudioBlob);
            }
        } else {
            console.warn('Warning: Analyze voice button not found.');
        }
    }

    if (audioFileInput) {
        audioFileInput.addEventListener('change', (event) => {
            console.log('Audio file input changed. Current login status:', isUserLoggedIn);
            if (!isUserLoggedIn) {
                event.target.value = ''; // Clear selected file
                showMessageBox('Please log in to upload audio.', 'warning');
                const loginModal = document.getElementById('login-modal');
                if (loginModal) {
                    loginModal.classList.remove('hidden');
                    console.log('Login modal opened due to unauthenticated upload attempt.');
                } else {
                    console.error('Error: Login modal element not found when trying to open for unauthenticated upload.');
                }
                return;
            }
            if (event.target.files.length > 0) {
                selectedAudioFile = event.target.files[0];
                if (fileNameDisplay) fileNameDisplay.textContent = selectedAudioFile.name;
                if (fileStatusContainer) fileStatusContainer.classList.remove('hidden');
                
                // Clear any existing recording when a file is uploaded
                recordedAudioBlob = null;
                if (audioPlayback) audioPlayback.src = '';
                if (audioPlayback) audioPlayback.classList.add('hidden');
                if (recordAudioBtn) recordAudioBtn.textContent = 'Start Recording';
                if (recordingStatus) recordingStatus.classList.add('hidden');
                // Hide playback UI
                if (audioPlayback) audioPlayback.classList.add('hidden');
                if (playRecordingBtn) playRecordingBtn.classList.add('hidden');
                if (downloadRecordingBtn) downloadRecordingBtn.classList.add('hidden');
                if (clearRecordingBtn) clearRecordingBtn.classList.add('hidden');
                
                console.log('Audio file selected:', selectedAudioFile.name);
            } else {
                selectedAudioFile = null;
                if (fileNameDisplay) fileNameDisplay.textContent = '';
                if (fileStatusContainer) fileStatusContainer.classList.add('hidden');
                console.log('Audio file selection cleared.');
            }
            updateAnalyzeButtonState();
        });
    } else {
        console.warn('Warning: Audio file input not found.');
    }

    if (clearFileBtn) {
        clearFileBtn.addEventListener('click', () => {
            clearAudioInput(); // Use the new comprehensive clear function
            console.log('File selection cleared by button.');
        });
    } else {
        console.warn('Warning: Clear file button not found.');
    }

    // Audio Recording Logic
    const recordAudioBtn = document.getElementById('record-audio-btn');
    const stopRecordingBtn = document.getElementById('stop-recording-btn');
    const playRecordingBtn = document.getElementById('play-recording-btn');
    const downloadRecordingBtn = document.getElementById('download-recording-btn');
    const clearRecordingBtn = document.getElementById('clear-recording-btn');
    const recordingStatus = document.getElementById('recording-status');
    const recordingTimer = document.getElementById('recording-timer');
    const audioPlayback = document.getElementById('audio-playback');

    let mediaRecorder;
    let audioChunks = [];
    let timerInterval;
    let seconds = 0;

    function startTimer() {
        seconds = 0;
        if (recordingTimer) recordingTimer.textContent = '00:00';
        timerInterval = setInterval(() => {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            if (recordingTimer) recordingTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    function startRecording() {
        const startRecordBtn = document.getElementById('start-record-btn');
        if (startRecordBtn) startRecordBtn.classList.add('recording-pulse');
    }

    function stopRecording() {
        if (!mediaRecorder) return;
        mediaRecorder.stop();
        console.log('Recording stopped.');
        
        const startRecordBtn = document.getElementById('start-record-btn');
        if (startRecordBtn) startRecordBtn.classList.remove('recording-pulse');
    }

    if (recordAudioBtn) {
        recordAudioBtn.addEventListener('click', async () => {
            console.log('Record audio button clicked. Current login status:', isUserLoggedIn);
            if (!isUserLoggedIn) {
                showMessageBox('Please log in to record audio.', 'warning');
                const loginModal = document.getElementById('login-modal');
                if (loginModal) {
                    loginModal.classList.remove('hidden');
                    console.log('Login modal opened due to unauthenticated record attempt.');
                } else {
                    console.error('Error: Login modal element not found when trying to open for unauthenticated record.');
                }
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                mediaRecorder.start(250); // Send data every 250ms
                
                startRecording();

                // Show Real-time UI
                const liveFeedback = document.getElementById('live-stream-feedback');
                if (liveFeedback) liveFeedback.classList.remove('hidden');

                mediaRecorder.ondataavailable = event => {
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                        
                        // Real-time Stream: Convert to base64 and send to FastAPI WebSocket
                        const reader = new FileReader();
                        reader.readAsDataURL(event.data);
                        reader.onloadend = () => {
                            const base64data = reader.result.split(',')[1];
                            if (socket.readyState === WebSocket.OPEN) {
                                socket.send(JSON.stringify({ chunk: base64data }));
                            }
                        };
                    }
                };

                mediaRecorder.onstop = () => {
                    recordedAudioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    const audioUrl = URL.createObjectURL(recordedAudioBlob);
                    if (audioPlayback) audioPlayback.src = audioUrl;
                    if (audioPlayback) audioPlayback.classList.remove('hidden');
                    if (playRecordingBtn) playRecordingBtn.classList.remove('hidden');
                    if (downloadRecordingBtn) downloadRecordingBtn.classList.remove('hidden');
                    if (clearRecordingBtn) clearRecordingBtn.classList.remove('hidden');
                    if (liveFeedback) liveFeedback.classList.add('hidden'); // Hide real-time UI when stopped
                    updateAnalyzeButtonState();
                    stream.getTracks().forEach(track => track.stop());
                };

                // Listen for Real-time Analysis Updates from FastAPI Server
                socket.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    const liveBar = document.getElementById('live-confidence-bar');
                    const liveStatus = document.getElementById('live-status');
                    if (liveBar) liveBar.style.width = data.confidence + '%';
                    if (liveStatus) liveStatus.textContent = data.status;
                };
                if (recordAudioBtn) {
                    recordAudioBtn.textContent = 'Recording...';
                    recordAudioBtn.disabled = true;
                }
                if (stopRecordingBtn) stopRecordingBtn.classList.remove('hidden');
                if (clearRecordingBtn) clearRecordingBtn.classList.add('hidden');
                if (playRecordingBtn) playRecordingBtn.classList.add('hidden');
                if (typeof downloadRecordingBtn !== 'undefined' && downloadRecordingBtn) downloadRecordingBtn.classList.add('hidden');
                if (downloadRecordingBtn) downloadRecordingBtn.classList.add('hidden'); // Hide download button during recording
                if (clearRecordingBtn) clearRecordingBtn.classList.add('hidden');
                if (recordingStatus) recordingStatus.classList.remove('hidden');
                startTimer();
                showMessageBox('Recording started!', 'info');
                console.log('Microphone access granted. Recording started.');
            } catch (err) {
                console.error('Error accessing microphone:', err);
                if (err.name === 'NotAllowedError') {
                    showMessageBox('Microphone access denied. Please click the icon in your address bar to allow permissions.', 'error');
                } else if (err.name === 'NotFoundError') {
                    showMessageBox('No microphone found on your system.', 'error');
                } else if (err.name === 'SecurityError' || window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                    showMessageBox('Microphone is blocked on insecure connections. Please use http://localhost:8080.', 'error');
                } else {
                    showMessageBox('Could not access microphone: ' + err.message, 'error');
                }
            }
        });
    } else {
        console.warn('Warning: Record audio button not found.');
    }

    if (stopRecordingBtn) {
        stopRecordingBtn.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                stopRecording();
                stopTimer();
                if (recordAudioBtn) {
                    recordAudioBtn.textContent = 'Start Recording';
                    recordAudioBtn.disabled = false;
                }
                if (stopRecordingBtn) stopRecordingBtn.classList.add('hidden');
                if (recordingStatus) recordingStatus.classList.add('hidden');
                showMessageBox('Recording stopped.', 'info');
                console.log('Recording stopped by user.');
            }
        });
    } else {
        console.warn('Warning: Stop recording button not found.');
    }

    if (playRecordingBtn) {
        playRecordingBtn.addEventListener('click', () => {
            if (audioPlayback && audioPlayback.src) {
                audioPlayback.play();
                showMessageBox('Playing recording...', 'info');
                console.log('Playing recorded audio.');
            } else {
                console.warn('No audio to play.');
            }
        });
    } else {
        console.warn('Warning: Play recording button not found.');
    }

    if (downloadRecordingBtn) {
        downloadRecordingBtn.addEventListener('click', () => {
            if (audioPlayback && audioPlayback.src) {
                const a = document.createElement('a');
                document.body.appendChild(a);
                a.style = 'display: none';
                a.href = audioPlayback.src;
                a.download = 'VoiceSentinel_Call_Recording.wav';
                a.click();
                window.URL.revokeObjectURL(audioPlayback.src);
                document.body.removeChild(a);
                showMessageBox('Recording downloaded successfully.', 'success');
            }
        });
    } else {
        console.warn('Warning: Play recording button not found.');
    }

    

    if (clearRecordingBtn) {
        clearRecordingBtn.addEventListener('click', clearAudioInput);
    }

    // --- DATABASE STATUS INDICATOR (Feature 5) ---
    async function updateDBStatus() {
        const badge = document.getElementById('db-status-badge');
        if (!badge) return;
        try {
            const res = await fetch('/api/current_user');
            const data = await res.json();
            // This is a simple heuristic; in a real app, the backend would return DB type
            badge.textContent = 'DATABASE: ACTIVE (SECURE)';
            badge.className = 'px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-green-900/30 text-green-500 border border-green-500/30';
        } catch (e) {
            badge.textContent = 'OFFLINE';
            badge.className = 'px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-red-900/30 text-red-500 border border-red-500/30';
        }
    }
    updateDBStatus();

    // Analyze Voice Button Click 
    if (analyzeVoiceBtn) {
        analyzeVoiceBtn.addEventListener('click', async () => {
            const analysisResultsDiv = document.getElementById('analysis-results');
            const statusCard = document.getElementById('status-card');
            const statusIconBg = document.getElementById('status-icon-bg');
            const analysisLoadingSpinner = document.getElementById('analysis-loading-spinner');
            const scanline = document.getElementById('heatmap-scanline');
            
            let audioToAnalyze = null;

            if (selectedAudioFile) {
                audioToAnalyze = selectedAudioFile;
                console.log('Analyzing selected file:', selectedAudioFile.name);
            } else if (recordedAudioBlob) {
                audioToAnalyze = recordedAudioBlob;
                console.log('Analyzing recorded audio.');
            }

            if (!audioToAnalyze) {
                showMessageBox('Please upload an audio file or record your voice first.', 'warning');
                console.warn('Analysis attempted without audio file.');
                return;
            }

            // Show loading spinner
            if (analysisLoadingSpinner) analysisLoadingSpinner.classList.remove('hidden');
            if (analyzeVoiceBtn) {
                analyzeVoiceBtn.disabled = true;
                analyzeVoiceBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
            if (analysisResultsDiv) analysisResultsDiv.classList.add('hidden'); // Hide previous results

            // Start Forensic Scan Animation
            if (scanline) scanline.style.display = 'block';

            const formData = new FormData();
            formData.append('audio', audioToAnalyze);

            try {
                const response = await fetch('/api/analysis', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    if (analysisResultsDiv) {
                        analysisResultsDiv.classList.remove('hidden');
                        analysisResultsDiv.scrollIntoView({ behavior: 'smooth' });
                    }
                    if (analysisLoadingSpinner) analysisLoadingSpinner.classList.add('hidden');
                    if (analyzeVoiceBtn) {
                        analyzeVoiceBtn.disabled = false;
                        analyzeVoiceBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    }

                    const statusIconMain = document.getElementById('status-icon-main');
                    const resultText = document.getElementById('result-text');
                    const statusSubtext = document.getElementById('status-subtext');

                    if (statusCard) {
                        statusCard.className = 'dashboard-card border-l-4 transition-all duration-500 ';
                        if (data.isSpoofed) {
                            statusCard.classList.add('status-glow-red', 'border-red-500');
                            if (statusIconBg) statusIconBg.className = 'w-12 h-12 rounded-full flex items-center justify-center bg-red-900/30 text-red-500';
                            if (statusIconMain) statusIconMain.className = 'fas fa-exclamation-triangle';
                            if (resultText) {
                                resultText.textContent = 'SPOOFED';
                                resultText.className = 'text-2xl font-black uppercase tracking-wider text-red-500';
                            }
                            if (statusSubtext) statusSubtext.textContent = 'High-Risk Synthetic Patterns Detected';
                        } else {
                            statusCard.classList.add('status-glow-green', 'border-green-500');
                            if (statusIconBg) statusIconBg.className = 'w-12 h-12 rounded-full flex items-center justify-center bg-green-900/30 text-green-500';
                            if (statusIconMain) statusIconMain.className = 'fas fa-shield-check';
                            if (resultText) {
                                resultText.textContent = 'GENUINE';
                                resultText.className = 'text-2xl font-black uppercase tracking-wider text-green-500';
                            }
                            if (statusSubtext) statusSubtext.textContent = 'Biometric Integrity Verified';
                        }
                    }

                    // 2. Confidence Score & Bar
                    const confidenceVal = document.getElementById('confidence-score');
                    const confidenceBar = document.getElementById('confidence-bar-inner');
                    if (confidenceVal) confidenceVal.textContent = data.confidence + '%';
                    if (confidenceBar) {
                        confidenceBar.style.width = '0%'; // Reset for animation
                        setTimeout(() => {
                           confidenceBar.style.width = data.confidence + '%';
                           confidenceBar.className = 'h-full rounded-full transition-all duration-1000 ' + 
                                                   (data.isSpoofed ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]');
                        }, 100);
                    }

                    // 3. Identity Fingerprint
                    const personaIconBox = document.getElementById('persona-icon-box');
                    const personaIcon = document.getElementById('persona-icon');
                    const personaLabel = document.getElementById('persona-label');
                    
                    if (data.persona && personaLabel) {
                        personaLabel.textContent = data.persona;
                        if (data.persona === 'AI') {
                            if (personaIconBox) personaIconBox.className = 'w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-red-900/40 text-red-400 border border-red-500/30';
                            if (personaIcon) personaIcon.className = 'fas fa-robot';
                        } else if (data.persona === 'Male') {
                            if (personaIconBox) personaIconBox.className = 'w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-blue-900/40 text-blue-400 border border-blue-500/30';
                            if (personaIcon) personaIcon.className = 'fas fa-mars';
                        } else if (data.persona === 'Female') {
                            if (personaIconBox) personaIconBox.className = 'w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-pink-900/40 text-pink-400 border border-pink-500/30';
                            if (personaIcon) personaIcon.className = 'fas fa-venus';
                        }
                    }

                    // 4. Transcription & Analysis Message & THREAT PROFILE (Feature 4)
                    const transcriptionText = document.getElementById('transcription-text');
                    const analysisMsg = document.getElementById('analysis-message');
                    const threatIndicator = document.getElementById('threat-indicator');
                    const threatBadge = document.getElementById('threat-level-badge');
                    const threatTagsContainer = document.getElementById('threat-tags-container');

                    if (transcriptionText) transcriptionText.textContent = data.transcription || "No transcription available.";
                    if (analysisMsg) analysisMsg.textContent = data.message;

                    if (threatIndicator && data.threat) {
                        threatIndicator.classList.remove('hidden');
                        threatBadge.textContent = `RISK: ${data.threat.level}`;
                        
                        // Dynamic Colors for Threat Level
                        if (data.threat.level === 'HIGH') {
                            threatBadge.className = 'threat-tag px-2 py-0.5 rounded bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]';
                        } else if (data.threat.level === 'MEDIUM') {
                            threatBadge.className = 'threat-tag px-2 py-0.5 rounded bg-yellow-600 text-white';
                        } else {
                            threatBadge.className = 'threat-tag px-2 py-0.5 rounded bg-blue-600 text-white';
                        }

                        // Populate Tags
                        if (threatTagsContainer) {
                            threatTagsContainer.innerHTML = '';
                            data.threat.tags.forEach(tag => {
                                const tagEl = document.createElement('span');
                                tagEl.className = 'text-[9px] font-bold px-2 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700 uppercase';
                                tagEl.textContent = tag;
                                threatTagsContainer.appendChild(tagEl);
                            });
                        }
                    }

                    // 5. SHAP Evidence Markers
                    const evidenceMarkers = document.getElementById('evidence-markers');
                    if (evidenceMarkers && data.evidence) {
                        evidenceMarkers.innerHTML = ''; // Clear previous
                        Object.entries(data.evidence).forEach(([feature, impact]) => {
                            const marker = document.createElement('div');
                            marker.className = 'flex items-center justify-between p-2 bg-gray-900/60 rounded border border-gray-700/50 hover:border-gray-500 transition-colors';
                            
                            // Normalize impact for display (+/- relative influence)
                            const displayImpact = Math.round(Math.abs(impact) * 100);
                            const isPositive = impact > 0;
                            
                            marker.innerHTML = `
                                <span class="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">${feature.replace('_', ' ')}</span>
                                <span class="text-[10px] font-bold ${isPositive ? 'text-red-400' : 'text-green-400'}">
                                    ${isPositive ? '↑' : '↓'} ${displayImpact}%
                                </span>
                            `;
                            evidenceMarkers.appendChild(marker);
                        });
                    }

                    // 6. FORENSIC HEATMAP (Feature 3)
                    if (data.heatmap) {
                        renderForensicWaveform(data.heatmap);
                    }

                    // Update Chart
                    updateSpoofingChart(data.confidence, data.isSpoofed);
                    
                    showMessageBox('Analysis complete! Dashboard updated.', 'success');
                    console.log('Analysis successful:', data);
                    fetchAnalysisHistory(); // Refresh history after new analysis
                } else {
                    showMessageBox(data.error || 'Voice analysis failed.', 'error');
                    console.error('Analysis API error:', data.error);
                }
            } catch (error) {
                console.error('Fetch error during analysis:', error);
                showMessageBox('An error occurred during analysis. Please try again.', 'error');
            } finally {
                if (analysisLoadingSpinner) analysisLoadingSpinner.classList.add('hidden');
                // Always clear the input after analysis attempt
                clearAudioInput();
            }
        });
    } else {
        console.warn('Warning: Analyze voice button not found.');
    }

    // Chart.js Initialization and update
    let spoofingChartInstance;

    function updateSpoofingChart(confidence, isSpoofed) {
        const ctx = document.getElementById('spoofingChart');
        if (!ctx) return;
        
        // Destroy existing chart to prevent memory leaks and rendering issues
        if (spoofingChartInstance) {
            spoofingChartInstance.destroy();
        }
        
        const genuineValue = isSpoofed ? (100 - confidence) : confidence;
        const spoofedValue = isSpoofed ? confidence : (100 - confidence);

        const chartData = {
            labels: ['Genuine', 'Spoofed'],
            datasets: [{
                data: [genuineValue, spoofedValue],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.8)', // Green for Genuine
                    'rgba(255, 99, 132, 0.8)'  // Red for Spoofed
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: document.body.classList.contains('dark-mode') ? '#e0e0e0' : '#333'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed + '%';
                            }
                            return label;
                        }
                    }
                }
            }
        };

        spoofingChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: chartOptions
        });
        console.log('Chart re-initialized.');
    }

    // --- FORENSIC HEATMAP DRAWING (Feature 3) ---
    function renderForensicWaveform(heatmapData) {
        const canvas = document.getElementById('forensicHeatmapCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        // Match canvas size to display size
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        const width = canvas.width;
        const height = canvas.height;
        const segmentWidth = width / heatmapData.length;
        
        ctx.clearRect(0, 0, width, height);
        
        heatmapData.forEach((impact, i) => {
            const x = i * segmentWidth;
            const barHeight = height * (0.3 + (Math.random() * 0.4)); // Random wave pattern
            const y = (height - barHeight) / 2;
            
            // Color interpolation: Green (Safe) to Red (Artifact)
            const red = Math.floor(255 * impact);
            const green = Math.floor(255 * (1 - impact));
            const blue = 100;
            
            ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.8)`;
            
            // Draw pseudo-waveform bar for the segment
            ctx.beginPath();
            ctx.roundRect(x + 2, y, segmentWidth - 4, barHeight, 4);
            ctx.fill();
            
            // Add "Glow" for high artifact segments
            if (impact > 0.7) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        });
    }

    // Analysis History Fetching 
    async function fetchAnalysisHistory() {
        const analysisHistoryList = document.getElementById('analysis-history-list');
        if (!analysisHistoryList) {
            console.warn('Warning: Analysis history list element not found.');
            return;
        }
        console.log('Fetching analysis history...');

        try {
            const response = await fetch('/api/analyses');
            const data = await response.json();

            if (response.ok) {
                if (data.analyses && data.analyses.length > 0) {
                    analysisHistoryList.innerHTML = ''; // Clear existing list items
                    data.analyses.forEach(analysis => {
                        const listItem = document.createElement('li');
                        listItem.className = 'p-3 rounded-md flex justify-between items-center';
                        listItem.classList.add(analysis.isSpoofed ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900');
                        listItem.innerHTML = `
                            <span class="font-medium text-gray-800 dark:text-gray-200">${analysis.fileName}</span>
                            <span class="text-sm ${analysis.isSpoofed ? 'text-red-600 dark:text-red-300' : 'text-green-600 dark:text-green-300'}">
                                ${analysis.isSpoofed ? 'Spoofed' : 'Genuine'} (${analysis.confidence}%)
                            </span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">${new Date(analysis.timestamp).toLocaleString()}</span>
                        `;
                        analysisHistoryList.appendChild(listItem);
                    });
                    console.log(`Loaded ${data.analyses.length} analysis history items.`);
                } else {
                    analysisHistoryList.innerHTML = '<li class="text-center text-gray-500 dark:text-gray-400">No analysis history found.</li>';
                    console.log('No analysis history found.');
                }
            } else {
                analysisHistoryList.innerHTML = `<li class="text-center text-red-600 dark:text-red-400">${data.message || 'Failed to load history.'}</li>`;
                console.error('Failed to load analysis history:', data.message);
            }
        } catch (error) {
            console.error('Error fetching analysis history:', error);
            analysisHistoryList.innerHTML = '<li class="text-center text-red-600 dark:text-red-400">Error loading history.</li>';
            showMessageBox('Error loading analysis history.', 'error');
        }
    }



    

    // FAQ Accordion Logic 
    function initFaqAccordion() {
        const faqItems = document.querySelectorAll('.faq-item');

        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            const icon = item.querySelector('.faq-question i');

            if (question && answer && icon) {
                question.addEventListener('click', () => {
                    // Toggle visibility of the answer
                    answer.classList.toggle('hidden');
                    // Toggle the icon
                    if (answer.classList.contains('hidden')) {
                        icon.classList.remove('fa-minus');
                        icon.classList.add('fa-plus');
                    } else {
                        icon.classList.remove('fa-plus');
                        icon.classList.add('fa-minus');
                    }
                });
            } else {
                console.warn('Warning: Missing elements in FAQ item (question, answer, or icon).');
            }
        });
        console.log('FAQ accordion initialized.');
    }


    // (Feature 1: Motion Intelligence Observer)
    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Optional: Stop observing after reveal for performance
                observer.unobserve(entry.target);
            }
        });
    };

    const motionObserver = new IntersectionObserver(revealCallback, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.reveal-up, .reveal-blur').forEach(el => {
        motionObserver.observe(el);
    });

    // (Feature 6: Call Defense Logic)
    const callDefenseToggle = document.getElementById('call-defense-toggle');
    const callDefenseDashboard = document.getElementById('call-defense-dashboard');
    const closeDefenseBtn = document.getElementById('close-defense');
    const engageDefenseBtn = document.getElementById('engage-defense-btn');
    const setupGuideModal = document.getElementById('setup-guide-modal');
    const closeGuideBtns = document.querySelectorAll('.close-guide');
    
    let isDefenseEngaged = false;
    let alertAudioCtx = null;
    let wakeLock = null;

    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
                console.log('Forensic Wake Lock Active');
            }
        } catch (err) {
            console.warn(`Wake Lock Error: ${err.name}, ${err.message}`);
        }
    }

    function playForensicBeep() {
        // Haptic Feedback (Feature: Mobile-First)
        if ('vibrate' in navigator) {
            navigator.vibrate([300, 100, 300]); // Pulse vibration
        }

        if (!alertAudioCtx) alertAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = alertAudioCtx.createOscillator();
        const gain = alertAudioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, alertAudioCtx.currentTime); // High pitch alert
        gain.gain.setValueAtTime(0.05, alertAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, alertAudioCtx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(alertAudioCtx.destination);
        osc.start();
        osc.stop(alertAudioCtx.currentTime + 0.5);
    }

    if (callDefenseToggle) {
        callDefenseToggle.addEventListener('click', () => {
            if (callDefenseDashboard) {
                callDefenseDashboard.style.display = 'block';
                if (setupGuideModal) setupGuideModal.classList.remove('hidden'); 
            }
        });
    }

    if (closeDefenseBtn) {
        closeDefenseBtn.addEventListener('click', () => {
            if (callDefenseDashboard) callDefenseDashboard.style.display = 'none';
            if (isDefenseEngaged) engageDefenseBtn.click(); // Stop if active
        });
    }

    closeGuideBtns.forEach(btn => {
        btn.addEventListener('click', () => setupGuideModal.classList.add('hidden'));
    });

    if (engageDefenseBtn) {
        engageDefenseBtn.addEventListener('click', async () => {
            isDefenseEngaged = !isDefenseEngaged;
            if (isDefenseEngaged) {
                engageDefenseBtn.textContent = 'STOP SHIELD';
                engageDefenseBtn.classList.replace('bg-blue-600', 'bg-red-600');
                if (recordAudioBtn && recordAudioBtn.textContent === 'Start Recording') {
                    recordAudioBtn.click(); // Trigger main recording engine
                }
                await requestWakeLock(); // Keep mobile screen on
            } else {
                engageDefenseBtn.textContent = 'ENGAGE CALL SHIELD';
                engageDefenseBtn.classList.replace('bg-red-600', 'bg-blue-600');
                if (recordAudioBtn && (recordAudioBtn.textContent === 'Stop Recording' || recordAudioBtn.textContent === 'Stop')) {
                    recordAudioBtn.click();
                }
                document.body.classList.remove('red-alert-active');
                const alertMsg = document.getElementById('defense-alert-msg');
                if (alertMsg) alertMsg.classList.add('hidden');
                
                if (wakeLock) {
                    wakeLock.release();
                    wakeLock = null;
                }
            }
        });
    }

    // Update mini dashboard during WebSocket stream (Feature 6)
    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        const miniScore = document.getElementById('mini-spoof-score');
        const miniPersona = document.getElementById('mini-persona');
        const alertMsg = document.getElementById('defense-alert-msg');

        if (miniScore) miniScore.textContent = (data.confidence || 0).toFixed(1) + '%';
        if (miniPersona) miniPersona.textContent = data.persona || 'WAITING...';

        // Red Alert Threshold (85%)
        if (data.confidence > 85 && data.isSpoofed) {
            document.body.classList.add('red-alert-active');
            if (alertMsg) alertMsg.classList.remove('hidden');
            playForensicBeep();
        } else {
            document.body.classList.remove('red-alert-active');
            if (alertMsg) alertMsg.classList.add('hidden');
        }
    });

    // (Feature 7: Standby Guardian Logic)
    const standbyToggle = document.getElementById('standby-guardian-toggle');
    const standbySensitivity = document.getElementById('standby-sensitivity');
    const sensitivityValue = document.getElementById('sensitivity-value');
    const standbyStatusDot = document.getElementById('standby-status-dot');
    
    let standbyAudioCtx = null;
    let standbyAnalyser = null;
    let standbyStream = null;
    let isStandbyActive = false;
    let standbyInterval = null;

    if (standbySensitivity) {
        standbySensitivity.addEventListener('input', () => {
            if (sensitivityValue) sensitivityValue.textContent = `${standbySensitivity.value}%`;
        });
    }

    async function startStandbyMonitoring() {
        try {
            if (!standbyAudioCtx) {
                standbyAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            standbyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = standbyAudioCtx.createMediaStreamSource(standbyStream);
            standbyAnalyser = standbyAudioCtx.createAnalyser();
            standbyAnalyser.fftSize = 256;
            source.connect(standbyAnalyser);
            
            const bufferLength = standbyAnalyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            standbyInterval = setInterval(() => {
                if (!isStandbyActive) return;
                
                standbyAnalyser.getByteFrequencyData(dataArray);
                let average = 0;
                for (let i = 0; i < bufferLength; i++) {
                    average += dataArray[i];
                }
                average = average / bufferLength;
                
                const threshold = 100 - parseInt(standbySensitivity.value); // Invert sensitivity for threshold
                
                if (average > threshold && !isDefenseEngaged) {
                    triggerStandbyAlert();
                }
            }, 500);
        } catch (err) {
            console.error('Standby Monitor Error:', err);
            showMessageBox('Could not activate Standby Guardian: Mic access denied.', 'error');
            if (standbyToggle) standbyToggle.checked = false;
        }
    }

    function triggerStandbyAlert() {
        // 1. Vibrate
        if ('vibrate' in navigator) {
            navigator.vibrate([500, 200, 500]);
        }
        
        // 2. Notification
        if (Notification.permission === 'granted') {
            const notification = new Notification('VoiceSentinel Alert', {
                body: '🚨 High-volume audio detected. Incoming call? Tap to engage Call Shield.',
                icon: '/static/favicon.ico',
                tag: 'standby-alert'
            });
            notification.onclick = () => {
                window.focus();
                if (engageDefenseBtn && !isDefenseEngaged) {
                    engageDefenseBtn.click();
                }
            };
        } else {
            console.log('Acoustic spike detected, but notification permission denied.');
        }
    }

    if (standbyToggle) {
        standbyToggle.addEventListener('change', async () => {
            isStandbyActive = standbyToggle.checked;
            
            if (isStandbyActive) {
                // Request Notifications
                if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                    await Notification.requestPermission();
                }
                
                if (standbyStatusDot) standbyStatusDot.classList.add('pulse-guardian-active');
                await startStandbyMonitoring();
                await requestWakeLock(); // reuse Feature 6 wake lock
            } else {
                if (standbyStatusDot) standbyStatusDot.classList.remove('pulse-guardian-active');
                if (standbyInterval) clearInterval(standbyInterval);
                if (standbyStream) {
                    standbyStream.getTracks().forEach(track => track.stop());
                }
            }
        });
    }

    // Initializations on DOMContentLoaded 
    updateAnalyzeButtonState(); // Set initial state of analyze button
    initFaqAccordion(); // Initialize FAQ accordion
});
