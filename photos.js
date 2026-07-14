$(document).ready(function() {
    const ALBUM_URL = "https://photos.google.com/share/AF1QipN95RmzYbRwuSi38USGjk7rg95Rt5JH6N1EyzR1T5mZJ_ZhbypcAbyrbxWITmOjww?key=MW5UNDZZMzd1VmUwQWhpUWlVdXBLS3NsSHVKYm1n";
    const AUDIO_SRC = "audio/The Pink Dream - Bring Into Being - 03 Ely Lights.wav";

    let mediaItems = []; // Array of URLs (images/videos)
    let currentItemIndex = -1;
    
    // Slideshow state
    let isSlideshowPlaying = false;
    let isShuffleActive = false;
    let slideshowInterval = null;
    let shuffledIndices = [];
    let currentShufflePos = -1;

    // Audio player state
    let audio = null;
    let isPlaying = false;
    let wasMusicPlayingBeforeVideo = false;

    // Initialize Page
    initGallery();
    initAudioPlayer();
    initLightbox();

    // Determine if file is a video
    function isVideo(url) {
        return url.toLowerCase().includes('.mp4') || 
               url.toLowerCase().includes('.webm') || 
               url.toLowerCase().includes('.mov') ||
               url.toLowerCase().includes('/sample/forbigger') || // Support sample URLs
               url.toLowerCase().includes('gtv-videos-bucket');
    }

    // Fetch Album HTML utilizing a CORS proxy
    async function fetchAlbumHtml(albumUrl) {
        try {
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(albumUrl)}`);
            if (!res.ok) throw new Error('AllOrigins failed');
            const data = await res.json();
            return data.contents;
        } catch (err) {
            console.warn('AllOrigins failed, trying CorsProxy.io...', err);
            try {
                const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(albumUrl)}`);
                if (!res.ok) throw new Error('CorsProxy.io failed');
                return await res.text();
            } catch (err2) {
                console.error('All CORS proxies failed', err2);
                throw err2;
            }
        }
    }

    // Load photos and videos
    async function initGallery() {
        const grid = $('#photosGrid');
        const loading = $('#galleryLoading');

        // Step 1: Check if STATIC_GALLERY has items (local index database)
        if (typeof STATIC_GALLERY !== 'undefined' && STATIC_GALLERY.length > 0) {
            mediaItems = STATIC_GALLERY;
            renderGrid(mediaItems);
            loading.fadeOut(300, () => grid.addClass('loaded'));
            return;
        }

        // Step 2: Fallback to Google Photos dynamic scraping if no local list is present
        try {
            const html = await fetchAlbumHtml(ALBUM_URL);
            const regex = /https:\/\/lh[0-9]+\.googleusercontent\.com\/pw\/[A-Za-z0-9\-_]{50,}/g;
            const matches = html.match(regex) || [];
            const uniqueUrls = [...new Set(matches)];
            
            if (uniqueUrls.length === 0) {
                throw new Error('No photos found in the Google Photos album.');
            }

            mediaItems = uniqueUrls;
            renderGrid(mediaItems);
            loading.fadeOut(300, () => grid.addClass('loaded'));
        } catch (err) {
            console.error('Failed to load dynamic gallery:', err);
            loading.html(`
                <p style="color: var(--pink); font-size: 1.1em; margin-bottom: 20px;">Could not load gallery directly.</p>
                <a href="${ALBUM_URL}" target="_blank" class="registryButton" style="width: auto !important; height: auto !important; padding: 12px 24px; color: var(--dark-blue); font-family: var(--serif-font); font-weight: bold; text-decoration: none; display: inline-block;">
                    View Shared Album
                </a>
            `);
        }
    }

    // Render Grid items
    function renderGrid(items) {
        const grid = $('#photosGrid').empty();
        items.forEach((url, index) => {
            let thumbUrl = url;
            let videoClass = '';

            if (isVideo(url)) {
                videoClass = 'video-item';
                // For demonstration, use a default placeholder image for video grid thumbnails
                thumbUrl = 'images/assets/images/engagement_ring.webp'; 
            } else if (url.includes('googleusercontent.com')) {
                // Resize googleusercontent images to w500 square thumbnail for the grid
                thumbUrl = `${url}=w500-h500-c`;
            }

            const item = $(`
                <div class="gallery-item ${videoClass}" data-index="${index}">
                    <img src="${thumbUrl}" alt="Wedding Media" loading="lazy">
                </div>
            `);
            grid.append(item);
        });
    }

    // Fullscreen lightbox viewer
    function initLightbox() {
        const lightbox = $('#lightbox');
        const lightboxImg = $('#lightboxImg');
        const lightboxVideo = $('#lightboxVideo');
        const closeBtn = $('.lightboxClose');
        const prevBtn = $('.lightboxPrev');
        const nextBtn = $('.lightboxNext');
        const playPauseBtn = $('#slideshowPlayPause');
        const shuffleBtn = $('#slideshowShuffle');
        const indexIndicator = $('#lightboxIndex');

        // Handle item click
        $(document).on('click', '.gallery-item', function() {
            const index = parseInt($(this).data('index'));
            openLightbox(index);
        });

        function openLightbox(index) {
            if (index < 0 || index >= mediaItems.length) return;
            currentItemIndex = index;
            
            const url = mediaItems[currentItemIndex];
            
            // Render index (1-indexed)
            indexIndicator.text(`${currentItemIndex + 1} / ${mediaItems.length}`);

            // Hide previous elements
            lightboxImg.hide();
            lightboxVideo.hide();
            
            // Reset video source
            lightboxVideo.attr('src', '');

            if (isVideo(url)) {
                // Element is video
                lightboxVideo.attr('src', url);
                lightboxVideo.show();
                lightboxImg.hide();
                
                // Automatically pause background music when video starts playing
                lightboxVideo[0].onplay = function() {
                    if (isPlaying) {
                        wasMusicPlayingBeforeVideo = true;
                        pauseBackgroundMusic();
                    }
                };

                // Automatically resume background music when video is paused/ended
                lightboxVideo[0].onpause = function() {
                    if (wasMusicPlayingBeforeVideo) {
                        playBackgroundMusic();
                        wasMusicPlayingBeforeVideo = false;
                    }
                };
                
                lightboxVideo[0].onended = function() {
                    if (wasMusicPlayingBeforeVideo) {
                        playBackgroundMusic();
                        wasMusicPlayingBeforeVideo = false;
                    }
                    // Auto-advance slideshow if enabled
                    if (isSlideshowPlaying) showNext();
                };

                // Attempt video autoplay
                lightboxVideo[0].play().catch(e => console.log('Video autoplay blocked:', e));

            } else {
                // Element is image
                let highResUrl = url;
                if (url.includes('googleusercontent.com')) {
                    highResUrl = `${url}=w1600`;
                }
                lightboxImg.attr('src', highResUrl);
                lightboxImg.show();
            }

            lightbox.addClass('show');
            $('body').css('overflow', 'hidden'); // Disable page scroll
            resetSlideshowTimer();
        }

        function closeLightbox() {
            lightbox.removeClass('show');
            $('body').css('overflow', 'auto'); // Re-enable page scroll
            
            // Stop any playing video
            if (!lightboxVideo[0].paused) {
                lightboxVideo[0].pause();
            }
            lightboxVideo.attr('src', '');

            // Resume background music if it was paused for video
            if (wasMusicPlayingBeforeVideo) {
                playBackgroundMusic();
                wasMusicPlayingBeforeVideo = false;
            }

            // Turn off slideshow
            if (isSlideshowPlaying) {
                toggleSlideshow();
            }
            
            setTimeout(() => {
                lightboxImg.attr('src', '');
            }, 300);
        }

        function showPrev() {
            if (mediaItems.length === 0) return;
            
            let newIndex;
            if (isShuffleActive) {
                currentShufflePos--;
                if (currentShufflePos < 0) currentShufflePos = shuffledIndices.length - 1;
                newIndex = shuffledIndices[currentShufflePos];
            } else {
                newIndex = currentItemIndex - 1;
                if (newIndex < 0) newIndex = mediaItems.length - 1;
            }
            
            openLightbox(newIndex);
        }

        function showNext() {
            if (mediaItems.length === 0) return;
            
            let newIndex;
            if (isShuffleActive) {
                currentShufflePos++;
                if (currentShufflePos >= shuffledIndices.length) currentShufflePos = 0;
                newIndex = shuffledIndices[currentShufflePos];
            } else {
                newIndex = currentItemIndex + 1;
                if (newIndex >= mediaItems.length) newIndex = 0;
            }
            
            openLightbox(newIndex);
        }

        // Slideshow controls
        playPauseBtn.on('click', function(e) {
            e.stopPropagation();
            toggleSlideshow();
        });

        shuffleBtn.on('click', function(e) {
            e.stopPropagation();
            toggleShuffle();
        });

        function toggleSlideshow() {
            isSlideshowPlaying = !isSlideshowPlaying;
            if (isSlideshowPlaying) {
                playPauseBtn.find('.icon-slideshow-play').hide();
                playPauseBtn.find('.icon-slideshow-pause').show();
                playPauseBtn.addClass('active');
                slideshowInterval = setInterval(showNext, 4000); // advance every 4 seconds
            } else {
                playPauseBtn.find('.icon-slideshow-pause').hide();
                playPauseBtn.find('.icon-slideshow-play').show();
                playPauseBtn.removeClass('active');
                clearInterval(slideshowInterval);
            }
        }

        function resetSlideshowTimer() {
            if (isSlideshowPlaying) {
                clearInterval(slideshowInterval);
                slideshowInterval = setInterval(showNext, 4000);
            }
        }

        function toggleShuffle() {
            isShuffleActive = !isShuffleActive;
            if (isShuffleActive) {
                shuffleBtn.addClass('active');
                generateShuffleSequence();
            } else {
                shuffleBtn.removeClass('active');
                shuffledIndices = [];
                currentShufflePos = -1;
            }
        }

        function generateShuffleSequence() {
            shuffledIndices = Array.from({length: mediaItems.length}, (_, i) => i);
            // Fisher-Yates shuffle
            for (let i = shuffledIndices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
            }
            // Start index tracking
            if (currentItemIndex !== -1) {
                currentShufflePos = shuffledIndices.indexOf(currentItemIndex);
            }
        }

        // Close triggers
        closeBtn.on('click', closeLightbox);
        lightbox.on('click', function(e) {
            if (e.target === this || e.target.classList.contains('lightboxContent')) {
                closeLightbox();
            }
        });

        // Navigation click events
        prevBtn.on('click', function(e) {
            e.stopPropagation();
            showPrev();
        });
        nextBtn.on('click', function(e) {
            e.stopPropagation();
            showNext();
        });

        // Keyboard bindings
        $(document).on('keydown', function(e) {
            if (!lightbox.hasClass('show')) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') showPrev();
            if (e.key === 'ArrowRight') showNext();
            if (e.key === ' ') {
                e.preventDefault();
                // Pause lightbox video or slideshow play/pause
                if (isVideo(mediaItems[currentItemIndex])) {
                    const vid = lightboxVideo[0];
                    if (vid.paused) vid.play(); else vid.pause();
                } else {
                    toggleSlideshow();
                }
            }
        });

        // Swipe support
        let touchStartX = 0;
        let touchEndX = 0;

        lightbox.on('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        });

        lightbox.on('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });

        function handleSwipe() {
            const threshold = 50;
            if (touchEndX < touchStartX - threshold) {
                showNext();
            }
            if (touchEndX > touchStartX + threshold) {
                showPrev();
            }
        }
    }

    // Audio player controller
    function initAudioPlayer() {
        const player = $('#audioPlayerWidget');
        const trigger = $('#playerTrigger');
        const playPauseBtn = $('#playPauseBtn');
        const progressBar = $('#progressBar');
        const progressBarContainer = $('#progressBarContainer');
        const timeCurrent = $('#timeCurrent');
        const timeDuration = $('#timeDuration');
        const volumeBtn = $('#volumeBtn');
        const volumeSlider = $('#volumeSlider');
        const minimizeBtn = $('#minimizeBtn');

        // Setup audio element
        audio = new Audio(AUDIO_SRC);
        audio.volume = 0.8;
        audio.loop = true;

        // Try music autoplay immediately
        playBackgroundMusic();

        // Autoplay logic if blocked
        function playAttempt() {
            audio.play().then(() => {
                isPlaying = true;
                player.removeClass('minimized');
                player.addClass('playing');
                playPauseBtn.find('.icon-play').hide();
                playPauseBtn.find('.icon-pause').show();
                // Remove listeners once autoplay succeeds
                $(document).off('click touchstart', firstInteractionPlay);
            }).catch(err => {
                console.log('Autoplay blocked. Waiting for first interaction...');
            });
        }

        // Listener for first user interaction
        function firstInteractionPlay() {
            playAttempt();
        }
        $(document).on('click touchstart', firstInteractionPlay);

        // UI triggers
        trigger.on('click', function() {
            player.removeClass('minimized');
            playBackgroundMusic();
        });

        playPauseBtn.on('click', function(e) {
            e.stopPropagation();
            if (isPlaying) {
                pauseBackgroundMusic();
            } else {
                playBackgroundMusic();
            }
        });

        minimizeBtn.on('click', function(e) {
            e.stopPropagation();
            player.addClass('minimized');
        });

        // Time durations
        audio.addEventListener('timeupdate', function() {
            if (audio.duration) {
                const progress = (audio.currentTime / audio.duration) * 100;
                progressBar.css('width', `${progress}%`);
                timeCurrent.text(formatTime(audio.currentTime));
            }
        });

        audio.addEventListener('loadedmetadata', function() {
            timeDuration.text(formatTime(audio.duration));
        });

        if (audio.readyState >= 1) {
            timeDuration.text(formatTime(audio.duration));
        }

        // Scrubber click
        progressBarContainer.on('click', function(e) {
            if (!audio.duration) return;
            const clickX = e.offsetX;
            const width = $(this).width();
            const newTime = (clickX / width) * audio.duration;
            audio.currentTime = newTime;
        });

        // Volume controls
        volumeSlider.on('input', function(e) {
            e.stopPropagation();
            audio.volume = $(this).val();
            updateVolumeIcon(audio.volume);
        });

        let previousVolume = 0.8;
        volumeBtn.on('click', function(e) {
            e.stopPropagation();
            if (audio.volume > 0) {
                previousVolume = audio.volume;
                audio.volume = 0;
                volumeSlider.val(0);
                updateVolumeIcon(0);
            } else {
                audio.volume = previousVolume;
                volumeSlider.val(previousVolume);
                updateVolumeIcon(previousVolume);
            }
        });

        function updateVolumeIcon(vol) {
            if (vol === 0) {
                volumeBtn.find('.icon-volume').hide();
                volumeBtn.find('.icon-mute').show();
            } else {
                volumeBtn.find('.icon-mute').hide();
                volumeBtn.find('.icon-volume').show();
            }
        }
    }

    // Global background music helpers
    function playBackgroundMusic() {
        if (!audio) return;
        audio.play().then(() => {
            isPlaying = true;
            $('#audioPlayerWidget').addClass('playing');
            $('#playPauseBtn').find('.icon-play').hide();
            $('#playPauseBtn').find('.icon-pause').show();
        }).catch(err => {
            console.log('Background music play blocked:', err);
        });
    }

    function pauseBackgroundMusic() {
        if (!audio) return;
        audio.pause();
        isPlaying = false;
        $('#audioPlayerWidget').removeClass('playing');
        $('#playPauseBtn').find('.icon-pause').hide();
        $('#playPauseBtn').find('.icon-play').show();
    }

    // Format seconds -> m:ss
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }
});
