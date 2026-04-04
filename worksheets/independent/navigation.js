// Page navigation script for Insight Mathematics worksheets
// Handles page-by-page navigation, keyboard controls, and UI interactions

let currentPage = 1;
let totalPages = 21; // Will be set dynamically for each worksheet
let currentAudio = null;
let audioSessionPrimed = false;
let audioEnabled = false;

const FADE = 180; // ms for each half of the page transition (fade-out, then fade-in)
let transitioning = false;

function showPage(pageNum) {
    // Stop audio from the previous page
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const page = document.getElementById('page-' + pageNum);
    if (page) {
        // Start at opacity 0 before making the page visible, so the fade-in begins cleanly
        page.style.opacity = '0';
        page.style.transition = 'none';
        page.classList.add('active');
        currentPage = pageNum;

        document.getElementById('pageInput').value = currentPage;

        document.getElementById('firstBtn').disabled = (currentPage === 1);
        document.getElementById('prevBtn').disabled = (currentPage === 1);
        document.getElementById('nextBtn').disabled = (currentPage === totalPages);
        document.getElementById('lastBtn').disabled = (currentPage === totalPages);

        const sidePrev = document.querySelector('.side-nav-prev');
        const sideNext = document.querySelector('.side-nav-next');
        if (sidePrev) sidePrev.disabled = (currentPage === 1);
        if (sideNext) sideNext.disabled = (currentPage === totalPages);

        if (window.MathJax && window.MathJax.typesetPromise) {
            MathJax.typesetPromise([page]);
        }

        // Reset any videos on this page to the beginning (or custom start time)
        const videos = page.querySelectorAll('video');
        videos.forEach(video => {
            let source = video.querySelector('source');
            const dataSrc = video.getAttribute('data-src');

            if (!source && dataSrc) {
                // Lazy-loaded video: inject source element now so the browser
                // never pre-buffers stale content from the initial HTML parse.
                source = document.createElement('source');
                source.type = 'video/mp4';
                video.appendChild(source);
            }

            if (source) {
                const rawSrc = dataSrc || (source.getAttribute('src') || '').replace(/[?#].*$/, '');
                source.setAttribute('src', rawSrc + '?cb=' + Date.now());
                const isCustomStart = video.id === 'video-page9' || video.id === 'video-page10';
                video.addEventListener('loadedmetadata', function() {
                    video.currentTime = isCustomStart ? 11 : 0;
                }, { once: true });
                video.load();
                video.play().catch(() => {});
            } else {
                if (video.id === 'video-page9' || video.id === 'video-page10') {
                    video.currentTime = 11;
                } else {
                    video.currentTime = 0;
                }
            }
        });

        // Play audio on this page if present.
        // Safari/Chrome: audio.play() works from any user gesture in the call stack.
        // Firefox: only whitelists spacebar as a media trigger on first interaction.
        // Fallback: if play() is blocked, intercept the next spacebar in capture phase
        // to unlock audio without advancing the page; subsequent gestures then work freely.
        const audio = page.querySelector('audio:not([data-trigger])');
        if (audio && audioEnabled) {
            currentAudio = audio;
            audio.play().catch(() => {
                let unlockHandler = null;
                unlockHandler = function(e) {
                    if (e.key === ' ') {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        audio.play().catch(() => {});
                        document.removeEventListener('keydown', unlockHandler, true);
                    }
                };
                document.addEventListener('keydown', unlockHandler, true);
            });
        }

        window.scrollTo(0, 0);
        updateScrollIndicator();

        // Fade in: force a reflow so the browser paints opacity:0 before the transition starts
        page.offsetHeight;
        page.style.transition = 'opacity ' + FADE + 'ms ease';
        page.style.opacity = '1';
        setTimeout(function () { page.style.transition = ''; page.style.opacity = ''; }, FADE + 50);
    }
}

function updateScrollIndicator() {
    const indicator = document.querySelector('.scroll-down-indicator');
    if (!indicator) return;
    const canScroll = document.body.scrollHeight > window.innerHeight + 20;
    const atBottom = (window.scrollY + window.innerHeight) >= document.body.scrollHeight - 20;
    if (canScroll && !atBottom) {
        indicator.classList.remove('hidden');
    } else {
        indicator.classList.add('hidden');
    }
}

// Handle video-page9 and video-page10 looping back to 11s instead of 0
document.addEventListener('DOMContentLoaded', function() {
    // Set total pages based on actual page count
    const pages = document.querySelectorAll('.page');
    if (pages.length > 0) {
        totalPages = pages.length;
        const pageInput = document.getElementById('pageInput');
        if (pageInput) {
            pageInput.max = totalPages;
        }
        // Update page indicator
        const pageIndicator = document.querySelector('.page-indicator');
        if (pageIndicator) {
            const newText = pageIndicator.innerHTML.replace(/of \d+/, 'of ' + totalPages);
            pageIndicator.innerHTML = newText;
        }
    }

    const videoPage9 = document.getElementById('video-page9');
    const videoPage10 = document.getElementById('video-page10');

    if (videoPage9) {
        videoPage9.addEventListener('timeupdate', function() {
            if (this.currentTime < 11) {
                this.currentTime = 11;
            }
        });
    }

    if (videoPage10) {
        videoPage10.addEventListener('timeupdate', function() {
            if (this.currentTime < 11) {
                this.currentTime = 11;
            }
        });
    }

    showPage(1);
});

function toggleAudio(btn) {
    audioEnabled = !audioEnabled;
    if (audioEnabled) {
        // Prime Firefox's autoplay gate on this click gesture if not already done
        if (!audioSessionPrimed) {
            const firstAudio = document.querySelector('audio');
            if (firstAudio) {
                const primer = new Audio(firstAudio.src);
                primer.volume = 0;
                primer.play().then(() => { primer.pause(); audioSessionPrimed = true; }).catch(() => {});
            }
        }
        // Play audio on the current page if it has one
        const page = document.getElementById('page-' + currentPage);
        if (page) {
            const audio = page.querySelector('audio:not([data-trigger])');
            if (audio) {
                currentAudio = audio;
                audio.currentTime = 0;
                audio.play().catch(() => {});
            }
        }
        if (btn) {
            btn.textContent = '🔊 Audio on';
            btn.classList.add('audio-on');
        }
    } else {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
        }
        if (btn) {
            btn.textContent = '🔇 Audio off';
            btn.classList.remove('audio-on');
        }
    }
}

function changePage(delta) {
    // On first forward navigation away from page 1, prime Firefox's audio autoplay gate.
    // A throwaway Audio object (not in the DOM) primes the session without touching the
    // real audio elements, so there is no volume/timing conflict.
    if (delta > 0 && currentPage === 1 && !audioSessionPrimed) {
        audioSessionPrimed = true;
        const firstAudio = document.querySelector('audio');
        if (firstAudio) {
            const primer = new Audio(firstAudio.src);
            primer.volume = 0;
            primer.play().then(() => primer.pause()).catch(() => {});
        }
    }
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        const fromEl = document.querySelector('.page.active');
        if (fromEl && !transitioning) {
            transitioning = true;
            fromEl.style.transition = 'opacity ' + FADE + 'ms ease';
            fromEl.style.opacity = '0';
            setTimeout(function () { transitioning = false; showPage(newPage); }, FADE);
        } else if (!transitioning) {
            showPage(newPage);
        }
    }
}

function goToPage(pageNum) {
    const num = parseInt(pageNum);
    if (num >= 1 && num <= totalPages) {
        showPage(num);
    } else {
        document.getElementById('pageInput').value = currentPage;
    }
}

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        changePage(1);
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        changePage(-1);
    }
});

// Show/hide navigation on mouse proximity
const nav = document.querySelector('.navigation');
if (nav) {
    document.addEventListener('mousemove', function(e) {
        const threshold = 100;
        const distanceFromBottom = window.innerHeight - e.clientY;
        const canScroll = document.body.scrollHeight > window.innerHeight + 20;
        const atBottom = (window.scrollY + window.innerHeight) >= document.body.scrollHeight - 20;
        if (distanceFromBottom < threshold && (!canScroll || atBottom)) {
            nav.classList.add('visible');
        } else {
            nav.classList.remove('visible');
        }
    });

    nav.addEventListener('mouseenter', function() {
        nav.classList.add('visible');
    });
}

// Touch device: side arrow buttons and swipe navigation
(function() {
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (!isTouchDevice) return;

    document.body.classList.add('touch-device');

    const prevArrow = document.createElement('button');
    prevArrow.className = 'side-nav-prev';
    prevArrow.innerHTML = '&#x25C4;';
    prevArrow.setAttribute('aria-label', 'Previous page');
    prevArrow.addEventListener('click', function() { changePage(-1); });

    const nextArrow = document.createElement('button');
    nextArrow.className = 'side-nav-next';
    nextArrow.innerHTML = '&#x25BA;';
    nextArrow.setAttribute('aria-label', 'Next page');
    nextArrow.addEventListener('click', function() { changePage(1); });

    document.body.appendChild(prevArrow);
    document.body.appendChild(nextArrow);

    const scrollIndicator = document.createElement('div');
    scrollIndicator.className = 'scroll-down-indicator';
    scrollIndicator.innerHTML = '&#x25BE;';
    document.body.appendChild(scrollIndicator);

    window.addEventListener('scroll', updateScrollIndicator, { passive: true });

    // Swipe gesture detection
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const minSwipeDistance = 50;

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX < 0) {
                changePage(1);   // Swipe left → next page
            } else {
                changePage(-1);  // Swipe right → previous page
            }
        }
    }, { passive: true });
})();

// Disable keyboard shortcuts for saving/printing
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
        e.preventDefault();
        return false;
    }
});
