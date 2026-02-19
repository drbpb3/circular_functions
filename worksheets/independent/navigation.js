// Page navigation script for Insight Mathematics worksheets
// Handles page-by-page navigation, keyboard controls, and UI interactions

let currentPage = 1;
let totalPages = 21; // Will be set dynamically for each worksheet

function showPage(pageNum) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const page = document.getElementById('page-' + pageNum);
    if (page) {
        page.classList.add('active');
        currentPage = pageNum;

        // Save current page to localStorage
        // Disabled: don't save page position
        // localStorage.setItem('currentPage', currentPage);

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
            if (video.id === 'video-page12' || video.id === 'video-page13') {
                video.currentTime = 11;
            } else {
                video.currentTime = 0;
            }
        });

        window.scrollTo(0, 0);
        updateScrollIndicator();
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

// Handle video-page12 and video-page13 looping back to 11s instead of 0
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

    const videoPage12 = document.getElementById('video-page12');
    const videoPage13 = document.getElementById('video-page13');

    if (videoPage12) {
        videoPage12.addEventListener('timeupdate', function() {
            if (this.currentTime < 11) {
                this.currentTime = 11;
            }
        });
    }

    if (videoPage13) {
        videoPage13.addEventListener('timeupdate', function() {
            if (this.currentTime < 11) {
                this.currentTime = 11;
            }
        });
    }

    // Initialize page from localStorage or default to page 1
    // Disabled: always start at page 1 for fresh viewing experience
    // const savedPage = localStorage.getItem('currentPage');
    const savedPage = null;
    const startPage = savedPage ? parseInt(savedPage) : 1;
    showPage(startPage);
});

function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        showPage(newPage);
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
    if (e.key === 'ArrowRight' || e.key === ' ') {
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
        if (distanceFromBottom < threshold) {
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
