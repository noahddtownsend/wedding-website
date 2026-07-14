$(document).ready(function() {
    const AUDIO_SRC = "audio/The Pink Dream - Bring Into Being - 03 Ely Lights.wav";

    let mediaItems = [];
    let currentItemIndex = -1;
    
    // Slideshow variables
    let slideshowInterval = null;
    let wipeTimeout = null;
    const SLIDESHOW_DELAY = 4000; // 4 seconds auto-advance

    // Audio state
    let audio = null;
    let isPlaying = false;
    let wasMusicPlayingBeforeVideo = false;

    // Determine if file is a video
    function isVideo(url) {
        return url.toLowerCase().includes('.mp4') || 
               url.toLowerCase().includes('.webm') || 
               url.toLowerCase().includes('.mov');
    }

    // Load photo chooser and slideshow
    function initGallery() {
        try {
            if (typeof STATIC_GALLERY !== 'undefined' && STATIC_GALLERY.length > 0) {
                mediaItems = shuffleArray([...STATIC_GALLERY]);
                
                renderChooserStrip(mediaItems);
                
                // Set initial slide to the first image (directly, no animation)
                if (mediaItems.length > 0) {
                    var firstImageIndex = 0;
                    for (var fi = 0; fi < mediaItems.length; fi++) {
                        if (mediaItems[fi].type === 'image') {
                            firstImageIndex = fi;
                            break;
                        }
                    }
                    loadInitialSlide(firstImageIndex);
                }
                
                // Load the first 15 thumbnails (after initial slide so active thumb is already set)
                loadFirstThumbnails();
                
                setupSlideshowControls();
            }
        } catch (e) {
            alert("Error in initGallery: " + e.message + "\n" + e.stack);
        }
    }

    function loadFirstThumbnails() {
        var count = Math.min(15, mediaItems.length);
        for (var i = 0; i < count; i++) {
            var thumbItem = mediaItems[i];
            var thumbWrapper = document.querySelector('.chooser-thumb-wrapper[data-index="' + i + '"]');
            if (thumbWrapper && thumbWrapper.querySelectorAll('img').length === 0) {
                var img = document.createElement('img');
                img.className = 'chooser-thumb';
                img.src = encodePath(thumbItem.thumb);
                img.alt = 'Thumbnail';
                thumbWrapper.appendChild(img);
            }
        }
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Helper to safely URL-encode local file paths (handling emojis, brackets, and spaces)
    function encodePath(p) {
        if (!p || p.startsWith('http')) return p;
        return p.split('/').map(segment => encodeURIComponent(segment)).join('/');
    }

    let chooserObserver = null;

    // Render horizontal chooser strip using lazy placeholder wrapper slots
    function renderChooserStrip(items) {
        const chooser = $('#photoChooser').empty();
        items.forEach((item, index) => {
            // Encode the thumbnail URL to make it browser-safe immediately
            const thumbUrl = encodePath(item.thumb);
            const isVid = item.type === 'video';
            
            let html = '<div class="chooser-thumb-wrapper" data-index="' + index + '" data-src="' + thumbUrl + '">';
            if (isVid) {
                html += '<div class="video-indicator">';
                html += '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">';
                html += '<path d="M8 5v14l11-7z" />';
                html += '</svg>';
                html += '</div>';
            }
            html += '</div>';
            
            const wrapper = $(html);
            
            wrapper.on('click', function() {
                changeSlide(index);
            });
            
            chooser.append(wrapper);
        });

        setupChooserObserver();
    }

    function setupChooserObserver() {
        const chooser = document.getElementById('photoChooser');
        if (!chooser) return;

        if (chooserObserver) chooserObserver.disconnect();

        chooserObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const wrapper = $(entry.target);
                    const src = wrapper.attr('data-src');
                    
                    // Inject image only when wrapper is scrolled into view
                    if (wrapper.find('img').length === 0) {
                        const img = $(`<img class="chooser-thumb" src="${src}" alt="Thumbnail" loading="lazy">`);
                        wrapper.append(img);
                    }
                }
            });
        }, {
            root: chooser,
            rootMargin: '150px',
            threshold: 0.01
        });

        document.querySelectorAll('.chooser-thumb-wrapper').forEach(el => {
            chooserObserver.observe(el);
        });
    }

    function createMediaWrapper(item) {
        const url = encodePath(item.src);
        const isVid = item.type === 'video';
        let mediaEl;
        if (isVid) {
            mediaEl = $('<video controls playsinline></video>').attr('src', url);
        } else {
            let renderUrl = url;
            if (url.includes('googleusercontent.com')) {
                renderUrl = renderUrl + '=w1600';
            }
            mediaEl = $('<img alt="Wedding photo">').attr('src', renderUrl);
        }
        
        const wrapper = $('<div class="media-wrapper"></div>').append(mediaEl);
        
        // Add the logo to the bottom right of the image/video
        var logoHtml = '<svg viewBox="0 0 53.046001 89.480003" xmlns="http://www.w3.org/2000/svg">';
        logoHtml += '<g><path style="display:inline;fill-opacity:1;stroke-width:2.59557;stroke-linecap:round;stroke-linejoin:round" ';
        logoHtml += 'd="M 31.535905,1.7483674 C 14.940495,7.4868674 5.3330852,23.712391 1.9698223,38.981481 -1.3231922,52.912001 4.116907,63.620561 13.042851,68.330291 l -7.3258605,18.93948 c -0.3009588,0.77827 -0.2643726,0.99745 0.085861,1.137503 0.4682008,0.18729 0.6027486,0.0332 0.9050733,-0.682403 l 7.8666742,-18.62165 c 18.043275,6.93149 35.683711,-9.51639 37.398161,-19.40229 0.854366,-6.42768 -5.932976,-6.64518 -11.652802,-7.57944 1.949561,-5.96864 3.987828,-12.90375 5.028599,-17.22428 C 47.15549,17.555156 49.536696,4.6333434 41.576527,1.6985364 39.687158,1.0423204 35.921115,0.50551838 31.535905,1.7483674 Z M 43.330038,24.495521 c -1.639154,5.98814 -3.916916,12.334 -5.582471,17.41389 l -4.266443,-0.4757 -0.397455,-16.89398 c -0.01819,-1.73133 -1.760681,-2.09725 -2.422232,-0.49719 l -6.132082,16.3314 c 0,0 -8.749842,-1.14202 -8.888835,-1.16013 -0.139122,-0.0182 -0.517711,-0.0551 -0.551741,0.31489 -0.03193,0.34609 0.154956,0.44174 0.413164,0.498 2.745358,0.59839 5.748949,1.08763 8.584507,1.61054 l -10.647049,25.63916 c -26.541303,-18.2495 4.862977,-71.6540574 26.622637,-65.0646176 9.544439,2.890326 4.464632,17.9121696 3.268,22.2837376 z m -11.865749,4.22509 -0.370982,12.47045 -4.389525,-0.5539 z m -5.236606,13.29259 4.888205,0.78984 -0.02779,18.96424 c 0.02336,1.76977 1.901906,1.9245 2.50413,0.26016 0,0 3.054378,-8.3824 6.104178,-17.53446 l 5.925998,0.86128 c 2.174372,0.41147 3.980142,1.30032 3.757291,3.89593 -0.968876,11.28414 -19.028534,24.92357 -34.382112,18.77771 z m 7.335931,1.25068 3.572559,0.68814 c -1.335342,3.99752 -2.767206,8.3566 -3.798499,11.30642 z" /></g></svg>';
        var logoContainer = $('<div class="slide-logo-container"></div>');
        logoContainer[0].innerHTML = logoHtml;
        wrapper.append(logoContainer);
        
        return wrapper;
    }

    // Load the first slide directly into the active container (no wipe animation)
    function loadInitialSlide(index) {
        currentItemIndex = index;
        var item = mediaItems[index];
        var isVid = item.type === 'video';
        var activeContainer = document.getElementById('slideActive');
        
        // Update index counter
        var indexEl = document.getElementById('slideshowIndex');
        if (indexEl) {
            indexEl.textContent = (index + 1) + ' / ' + mediaItems.length;
        }
        
        // Build the media element and place it directly in the active slide
        var wrapper = createMediaWrapper(item);
        if (isVid) {
            setupVideoEvents(wrapper.find('video'));
        }
        
        $(activeContainer).empty().append(wrapper);
        
        // Mark the active thumbnail
        $('.chooser-thumb-wrapper').removeClass('active');
        var activeThumb = document.querySelector('.chooser-thumb-wrapper[data-index="' + index + '"]');
        if (activeThumb) {
            activeThumb.classList.add('active');
        }
        
        // Preload neighbors
        preloadSurroundingMedia(index);
        
        // Start auto-advance timer
        if (!isVid) {
            resetSlideshowTimer();
        }
    }

    function changeSlide(newIndex) {
        console.log("changeSlide requested for index:", newIndex, "current index is:", currentItemIndex);
        if (newIndex < 0 || newIndex >= mediaItems.length || newIndex === currentItemIndex) {
            console.log("changeSlide ignored request (out of bounds or matches current index)");
            return;
        }
        
        const oldIndex = currentItemIndex;
        currentItemIndex = newIndex;
        
        const item = mediaItems[currentItemIndex];
        const isVid = item.type === 'video';
        const activeContainer = $('#slideActive');
        const incomingContainer = $('#slideIncoming');
        
        // Clear active advance timer while transitioning
        clearInterval(slideshowInterval);
        
        if (wipeTimeout) {
            clearTimeout(wipeTimeout);
            activeContainer.empty().append(incomingContainer.html());
            activeContainer.removeClass('fading-out');
            incomingContainer.removeClass('incoming').empty();
            wipeTimeout = null;
        }
        
        // Stop currently playing video in active slide
        const activeVideo = activeContainer.find('video');
        if (activeVideo.length > 0 && !activeVideo[0].paused) {
            activeVideo[0].pause();
        }
        
        // Update index text
        $('#slideshowIndex').text(`${currentItemIndex + 1} / ${mediaItems.length}`);
        
        // Update chooser active state
        $('.chooser-thumb-wrapper').removeClass('active');
        const activeThumb = $(`.chooser-thumb-wrapper[data-index="${currentItemIndex}"]`).addClass('active');
        
        // Force-load active thumbnail on slide switch
        if (activeThumb.length > 0) {
            if (activeThumb.find('img').length === 0) {
                activeThumb.append($(`<img class="chooser-thumb" src="${encodePath(item.thumb)}" alt="Thumbnail">`));
            }
            const strip = $('#photoChooser');
            const scrollLeft = activeThumb.position().left + strip.scrollLeft() - (strip.width() / 2) + (activeThumb.width() / 2);
            strip.animate({ scrollLeft: scrollLeft }, 300);
        }
        
        // Build incoming content
        incomingContainer.empty();
        const wrapper = createMediaWrapper(item);
        if (isVid) {
            setupVideoEvents(wrapper.find('video'));
        }
        
        incomingContainer.append(wrapper);
        
        // Force browser reflow to ensure the CSS animation triggers every time
        void incomingContainer[0].offsetWidth;
        
        activeContainer.addClass('fading-out');
        incomingContainer.addClass('incoming');
        
        // Swap slides once transition animation is complete
        wipeTimeout = setTimeout(() => {
            activeContainer.empty().append(incomingContainer.html());
            activeContainer.removeClass('fading-out');
            
            // Rebind events on active slide copy
            if (isVid) {
                const newVid = activeContainer.find('video');
                setupVideoEvents(newVid);
                newVid[0].play().catch(e => console.log('Autoplay blocked:', e));
            } else {
                if (wasMusicPlayingBeforeVideo) {
                    playBackgroundMusic();
                    wasMusicPlayingBeforeVideo = false;
                }
                resetSlideshowTimer();
            }
            
            // Preload next set of media items in cache
            preloadSurroundingMedia(currentItemIndex);
            
            incomingContainer.removeClass('incoming').empty();
            wipeTimeout = null;
        }, 400); // Matches the CSS 0.4s fade transition duration
    }

    // Preload next/prev main images and 8 thumbnails on either side of index
    function preloadSurroundingMedia(index) {
        if (mediaItems.length === 0) return;
        
        // 1. Preload 8 thumbnails on either side dynamically
        for (let offset = -8; offset <= 8; offset++) {
            if (offset === 0) continue;
            const targetIndex = (index + offset + mediaItems.length) % mediaItems.length;
            const thumbItem = mediaItems[targetIndex];
            const thumbWrapper = $(`.chooser-thumb-wrapper[data-index="${targetIndex}"]`);
            
            if (thumbWrapper.length > 0 && thumbWrapper.find('img').length === 0) {
                const encodedThumb = encodePath(thumbItem.thumb);
                thumbWrapper.append($(`<img class="chooser-thumb" src="${encodedThumb}" alt="Thumbnail" loading="lazy">`));
            }
        }
        
        // 2. Preload surrounding main slides (prev and next indices)
        const prevIndex = (index - 1 + mediaItems.length) % mediaItems.length;
        const nextIndex = (index + 1) % mediaItems.length;
        
        [prevIndex, nextIndex].forEach(idx => {
            const item = mediaItems[idx];
            if (item.type === 'image') {
                let renderUrl = encodePath(item.src);
                if (renderUrl.includes('googleusercontent.com')) {
                    renderUrl = `${renderUrl}=w1600`;
                }
                const img = new Image();
                img.src = renderUrl;
            } else if (item.type === 'video') {
                const videoUrl = encodePath(item.src);
                const tempVideo = document.createElement('video');
                tempVideo.src = videoUrl;
                tempVideo.preload = 'auto';
            }
        });
    }

    function setupVideoEvents(videoEl) {
        videoEl[0].onplay = function() {
            clearInterval(slideshowInterval); // Stop auto-advance
            if (isPlaying) {
                wasMusicPlayingBeforeVideo = true;
                pauseBackgroundMusic();
            }
        };
        
        videoEl[0].onpause = function() {
            resetSlideshowTimer(); // Resume auto-advance
            if (wasMusicPlayingBeforeVideo) {
                playBackgroundMusic();
                wasMusicPlayingBeforeVideo = false;
            }
        };
        
        videoEl[0].onended = function() {
            if (wasMusicPlayingBeforeVideo) {
                playBackgroundMusic();
                wasMusicPlayingBeforeVideo = false;
            }
            showNext();
        };
    }

    function showNext() {
        let nextIndex = currentItemIndex + 1;
        if (nextIndex >= mediaItems.length) nextIndex = 0;
        changeSlide(nextIndex);
    }

    function showPrev() {
        let prevIndex = currentItemIndex - 1;
        if (prevIndex < 0) prevIndex = mediaItems.length - 1;
        changeSlide(prevIndex);
    }

    function resetSlideshowTimer() {
        clearInterval(slideshowInterval);
        
        // Only auto-advance if the current slide is NOT a playing video
        const activeContainer = $('#slideActive');
        const activeVideo = activeContainer.find('video');
        if (activeVideo.length > 0 && !activeVideo[0].paused) {
            return;
        }
        
        slideshowInterval = setInterval(showNext, SLIDESHOW_DELAY);
    }

    function setupSlideshowControls() {
        // Arrow overrides
        $('#prevBtn').on('click', function(e) {
            e.stopPropagation();
            showPrev();
        });
        
        $('#nextBtn').on('click', function(e) {
            e.stopPropagation();
            showNext();
        });
        
        // Keyboard controls
        $(document).on('keydown', function(e) {
            if (e.key === 'ArrowLeft') showPrev();
            if (e.key === 'ArrowRight') showNext();
            if (e.key === ' ') {
                e.preventDefault();
                // Pause/play current video if active
                const activeContainer = $('#slideActive');
                const activeVideo = activeContainer.find('video');
                if (activeVideo.length > 0) {
                    if (activeVideo[0].paused) activeVideo[0].play();
                    else activeVideo[0].pause();
                }
            }
        });

        // Touch Swipe support
        let touchStartX = 0;
        let touchEndX = 0;
        const container = $('#slideshowContainer');

        container.on('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        container.on('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const threshold = 55;
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
        const minimizeBtn = $('#minimizeBtn');

        // Setup audio element
        audio = new Audio(AUDIO_SRC);
        audio.volume = 0.8;
        audio.loop = true;

        playBackgroundMusic();

        // Attempt to start audio on first interaction if autoplay is blocked
        $(document).one('click touchstart scroll', function() {
            if (!isPlaying && audio && audio.paused) {
                playBackgroundMusic();
            }
        });

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

        // Time updates
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

        progressBarContainer.on('click', function(e) {
            if (!audio.duration) return;
            const clickX = e.offsetX;
            const width = $(this).width();
            const newTime = (clickX / width) * audio.duration;
            audio.currentTime = newTime;
        });


    }

    function playBackgroundMusic() {
        if (!audio) return;
        // Don't play music if a video is currently active and playing
        const activeContainer = $('#slideActive');
        const activeVideo = activeContainer.find('video');
        if (activeVideo.length > 0 && !activeVideo[0].paused) {
            return;
        }
        
        audio.play().then(() => {
            isPlaying = true;
            $('#audioPlayerWidget').addClass('playing');
            $('#playPauseBtn').find('.icon-play').hide();
            $('#playPauseBtn').find('.icon-pause').show();
        }).catch(err => {
            console.log('Autoplay blocked:', err);
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

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    // Initialize gallery and audio after everything is defined
    initGallery();
    initAudioPlayer();
});
