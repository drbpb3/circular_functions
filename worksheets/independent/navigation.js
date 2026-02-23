// Page navigation script for Insight Mathematics worksheets
// Handles page-by-page navigation, keyboard controls, and UI interactions

let currentPage = 1;
let totalPages = 21; // Will be set dynamically for each worksheet

// Typewriter effect for page 2
let typewriterTimeout = null;
let typewriterWaiting = false;
let typewriterWaitCallback = null; // if set, spacebar calls this instead of resuming queue
let typewriterQueue = [];
let page2Originals = null;

// Answer div animation — add page numbers here to opt in
const answerAnimatedPages = new Set([3, 4, 6, 8, 9, 11, 13, 14, 15, 16, 17, 18, 20]);
const answerOriginals = {};
let answerAnimationId = 0;

// Intro div animation — add page numbers here to opt in
const introAnimatedPages = new Set([7]);
const introOriginals = {};

// Pages where the intro div auto-animates alongside/after the answer animation.
// Map: pageNum → delay ms after click (null = fire via onComplete, i.e. after all wipes)
const introChainPages = new Map([[3, 2000], [11, null], [16, null], [20, null]]);

// Per-page override for the gap (ms) between display math wipes (default: 3500)
const displayGapOverrides = new Map([[9, 1500], [14, 1500], [18, 1500], [20, 1500]]);

// Pages where wipes happen first, then text types (default: text types first, then wipes)
const wipesFirstPages = new Set([9]);

function stopTypewriter() {
    if (typewriterTimeout !== null) {
        clearTimeout(typewriterTimeout);
        typewriterTimeout = null;
    }
    typewriterWaiting = false;
    typewriterWaitCallback = null;
    hideTypewriterPrompt();
    answerAnimationId++; // cancel any pending answer animation
}

function showTypewriterPrompt(el, inside) {
    let prompt = document.getElementById('typewriter-prompt');
    if (!prompt) {
        prompt = document.createElement('div');
        prompt.id = 'typewriter-prompt';
        prompt.className = 'typewriter-prompt';
        const promptImg = document.createElement('img');
        promptImg.src = '../../../darklogo_circle.png';
        promptImg.alt = '';
        prompt.appendChild(promptImg);
        prompt.appendChild(document.createTextNode('click here to continue'));
        prompt.addEventListener('click', continueTypewriter);
    }
    if (inside) {
        el.appendChild(prompt);
    } else {
        // Move prompt to the correct position (insertBefore moves if already in DOM)
        el.parentNode.insertBefore(prompt, el);
    }
    prompt.style.display = 'flex';
}

function hideTypewriterPrompt() {
    const prompt = document.getElementById('typewriter-prompt');
    if (prompt) prompt.style.display = 'none';
}

function continueTypewriter() {
    if (!typewriterWaiting) return;
    typewriterWaiting = false;
    hideTypewriterPrompt();

    if (typewriterWaitCallback) {
        const cb = typewriterWaitCallback;
        typewriterWaitCallback = null;
        cb();
        return;
    }

    // Default: page 2 phase 2 — resume from typewriterQueue
    const items = typewriterQueue;
    typewriterQueue = [];

    let idx = 0;
    function tick() {
        if (idx >= items.length) { typewriterTimeout = null; return; }
        const item = items[idx++];
        item.node.textContent += item.char;
        const delay = /\S/.test(item.char) ? 25 : 0;
        typewriterTimeout = setTimeout(tick, delay);
    }
    tick();
}

function startTypewriterPage2() {
    const page = document.getElementById('page-2');
    if (!page) return;

    stopTypewriter();

    // Only animate the visible intro paragraphs (teacher-note is display:none; h2 is not animated)
    const elements = Array.from(page.querySelectorAll('.intro p'));

    // Save original HTML on first visit; restore it on subsequent visits
    if (page2Originals === null) {
        page2Originals = elements.map(el => el.innerHTML);
    } else {
        elements.forEach((el, i) => { el.innerHTML = page2Originals[i]; });
    }

    // Collect character items for each element separately
    const groups = elements.map(el => {
        const items = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            const text = node.textContent;
            node.textContent = '';
            for (let i = 0; i < text.length; i++) {
                items.push({ node, char: text[i] });
            }
        }
        return items;
    });

    // Phase 1: first intro p
    const phase1 = [...(groups[0] || [])];

    // Phase 2: second intro p — waits for spacebar before revealing
    typewriterQueue = groups[1] || [];
    typewriterWaiting = false;

    let idx = 0;
    function tick() {
        if (idx >= phase1.length) {
            showTypewriterPrompt(page.querySelectorAll('.intro')[1], true);
            typewriterWaiting = true;
            typewriterTimeout = null;
            return;
        }
        const item = phase1[idx++];
        let delay;
        if (item.pause) {
            delay = item.pause;
        } else {
            item.node.textContent += item.char;
            delay = /\S/.test(item.char) ? 25 : 0;
        }
        typewriterTimeout = setTimeout(tick, delay);
    }
    tick();
}

function startAnswerAnimation(pageNum, mjPromise) {
    const page = document.getElementById('page-' + pageNum);
    const answer = page ? page.querySelector('.answer, .key-concept') : null;
    if (!answer) return;

    // Hide any elements that should appear only after the answer animation completes
    const afterAnswerEls = Array.from(page.querySelectorAll('.after-answer'));
    afterAnswerEls.forEach(el => { el.style.display = 'none'; });

    // Check if this page also chains an intro animation after/alongside the answer
    const introDelay = introChainPages.has(pageNum) ? introChainPages.get(pageNum) : undefined;
    const introEl = introDelay !== undefined ? page.querySelector('.intro') : null;
    if (introEl) introEl.style.display = 'none';

    // Save the original (pre-MathJax) HTML on first visit; restore it on subsequent visits
    if (!answerOriginals[pageNum]) {
        answerOriginals[pageNum] = answer.innerHTML;
    } else {
        answer.innerHTML = answerOriginals[pageNum];
    }
    if (introEl) {
        if (!introOriginals[pageNum]) {
            introOriginals[pageNum] = introEl.innerHTML;
        } else {
            introEl.innerHTML = introOriginals[pageNum];
        }
    }

    // Hide the box while MathJax renders to avoid a flash of raw LaTeX
    answer.style.visibility = 'hidden';

    const myId = ++answerAnimationId;

    // Wait for MathJax, then blank the content and show the prompt inside the green box
    (mjPromise || Promise.resolve()).then(() => {
        if (myId !== answerAnimationId) return;
        // Save the MathJax-rendered HTML for the animation to use
        const rendered = answer.innerHTML;
        const renderedIntro = introEl ? introEl.innerHTML : null;
        // Blank the content and reveal the (now empty) green box
        answer.innerHTML = '';
        answer.style.visibility = '';
        typewriterWaitCallback = () => {
            if (myId !== answerAnimationId) return;
            // Restore rendered content; runAnswerAnimation will immediately blank it synchronously
            answer.innerHTML = rendered;
            const needsOnComplete = afterAnswerEls.length > 0 || (introEl && introDelay === null);
            const onComplete = needsOnComplete ? () => {
                if (myId !== answerAnimationId) return;
                afterAnswerEls.forEach(el => { el.style.display = ''; });
                if (introEl && introDelay === null && renderedIntro !== null) {
                    introEl.innerHTML = renderedIntro;
                    introEl.style.display = '';
                    runAnswerAnimation(introEl, myId, null);
                }
            } : null;
            const runOptions = displayGapOverrides.has(pageNum) ? { displayGap: displayGapOverrides.get(pageNum) } : {};
            if (wipesFirstPages.has(pageNum)) runOptions.wipesFirst = true;
            runAnswerAnimation(answer, myId, onComplete, runOptions);
            // Fixed-delay chain: start intro at specified time after click
            if (introEl && introDelay !== null && renderedIntro !== null) {
                setTimeout(() => {
                    if (myId !== answerAnimationId) return;
                    introEl.innerHTML = renderedIntro;
                    introEl.style.display = '';
                    runAnswerAnimation(introEl, myId, null);
                }, introDelay);
            }
        };
        typewriterWaiting = true;
        showTypewriterPrompt(answer, true); // prompt goes inside the green box
    });
}

function runAnswerAnimation(answer, myId, onComplete, options) {
    const paras = Array.from(answer.querySelectorAll('p'));
    const cells = Array.from(answer.querySelectorAll('td'));

    // Walk paragraph child nodes: text chars typed one-by-one, inline math appears
    // atomically, display math (\[...\]) added to wipe list.
    // If there are no <p> elements, walk the container's own child nodes directly.
    const units = [];
    const displayMath = [];

    function collectChildNodes(parent) {
        Array.from(parent.childNodes).forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent;
                child.textContent = '';
                for (let i = 0; i < text.length; i++) {
                    units.push({ type: 'char', node: child, char: text[i] });
                }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                // Display math containers (<mjx-container display="true">) wipe in
                if (child.hasAttribute('display')) {
                    displayMath.push(child);
                } else {
                    child.style.visibility = 'hidden';
                    units.push({ type: 'element', node: child });
                }
            }
        });
    }

    if (paras.length > 0) {
        paras.forEach((para, paraIdx) => {
            if (paraIdx > 0) {
                units.push({ type: 'pause', duration: 400 });
            }
            collectChildNodes(para);
        });
    } else {
        // No <p> elements — walk container's own children (e.g. plain-text key-concept)
        Array.from(answer.childNodes).forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent;
                child.textContent = '';
                for (let i = 0; i < text.length; i++) {
                    units.push({ type: 'char', node: child, char: text[i] });
                }
            } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'TABLE') {
                child.style.visibility = 'hidden';
                units.push({ type: 'element', node: child });
            }
        });
    }

    // Browsers eject block elements (display math) out of <p> tags, so they become
    // siblings of the <p> elements rather than children. Catch them here.
    answer.querySelectorAll('mjx-container[display]').forEach(el => {
        if (!displayMath.includes(el)) displayMath.push(el);
    });

    // Wipe targets: display math blocks (slower) first, then table cells (faster)
    const displayGap = (options && options.displayGap != null) ? options.displayGap : 3500;
    const wipesFirst = options && options.wipesFirst;
    const wipes = [
        ...displayMath.map(el => ({ el, gap: displayGap, transition: 'clip-path 2.5s ease-out' })),
        ...cells.map(el =>      ({ el, gap: 900,  transition: 'clip-path 0.75s ease-out' })),
    ];
    wipes.forEach(({ el, transition }) => {
        el.style.clipPath = 'inset(0 100% 0 0)';
        el.style.transition = transition;
    });
    // Force a reflow so the browser commits the initial clip-path state before
    // we start animating — prevents the transition being skipped when there is
    // no typed text (i.e. animateWipes fires almost immediately after setup).
    if (wipes.length > 0) wipes[0].el.getBoundingClientRect();

    let unitIdx = 0;
    let wipeIdx = 0;

    // Pause before wipes only if something visible was typed
    const hasTypedContent = units.some(
        u => (u.type === 'char' && /\S/.test(u.char)) || u.type === 'element'
    );

    function animatePara() {
        if (myId !== answerAnimationId) return;
        if (unitIdx >= units.length) {
            if (wipesFirst) {
                // Wipes already done; text just finished — call onComplete
                typewriterTimeout = null;
                if (onComplete) onComplete();
            } else {
                typewriterTimeout = setTimeout(animateWipes, hasTypedContent ? 400 : 0);
            }
            return;
        }
        const unit = units[unitIdx++];
        let delay;
        if (unit.type === 'char') {
            unit.node.textContent += unit.char;
            delay = /\S/.test(unit.char) ? 25 : 0;
        } else if (unit.type === 'element') {
            unit.node.style.visibility = '';
            delay = 60;
        } else {
            // pause between paragraphs
            delay = unit.duration;
        }
        typewriterTimeout = setTimeout(animatePara, delay);
    }

    function animateWipes() {
        if (myId !== answerAnimationId) return;
        if (wipeIdx >= wipes.length) {
            if (wipesFirst && units.length > 0) {
                // Wipes done; now type the text
                typewriterTimeout = setTimeout(animatePara, 400);
            } else {
                typewriterTimeout = null;
                if (onComplete) onComplete();
            }
            return;
        }
        const { el, gap } = wipes[wipeIdx++];
        el.style.clipPath = 'inset(0 0% 0 0)';
        typewriterTimeout = setTimeout(animateWipes, gap);
    }

    if (wipesFirst) {
        animateWipes();
    } else {
        animatePara();
    }
}

function startIntroAnimation(pageNum, mjPromise) {
    const page = document.getElementById('page-' + pageNum);
    if (!page) return;

    const intro = page.querySelector('.intro');
    if (!intro) return;

    // Hide elements that should appear only after the intro animation completes
    const afterIntroEls = Array.from(page.querySelectorAll('.after-intro'));
    afterIntroEls.forEach(el => { el.style.display = 'none'; });

    // Save the original (pre-MathJax) HTML on first visit; restore it on subsequent visits
    if (!introOriginals[pageNum]) {
        introOriginals[pageNum] = intro.innerHTML;
    } else {
        intro.innerHTML = introOriginals[pageNum];
    }

    // Hide while MathJax renders to avoid a flash of raw LaTeX
    intro.style.visibility = 'hidden';

    const myId = ++answerAnimationId;

    (mjPromise || Promise.resolve()).then(() => {
        if (myId !== answerAnimationId) return;
        intro.style.visibility = '';
        const onComplete = afterIntroEls.length > 0 ? () => {
            if (myId !== answerAnimationId) return;
            afterIntroEls.forEach(el => { el.style.display = ''; });
        } : null;
        runAnswerAnimation(intro, myId, onComplete);
    });
}

function showPage(pageNum) {
    stopTypewriter();

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

        let mjPromise = Promise.resolve();
        if (window.MathJax && window.MathJax.typesetPromise) {
            mjPromise = MathJax.typesetPromise([page]);
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
                const isCustomStart = video.id === 'video-page12' || video.id === 'video-page13';
                video.addEventListener('loadedmetadata', function() {
                    video.currentTime = isCustomStart ? 11 : 0;
                }, { once: true });
                video.load();
                video.play().catch(() => {});
            } else {
                if (video.id === 'video-page12' || video.id === 'video-page13') {
                    video.currentTime = 11;
                } else {
                    video.currentTime = 0;
                }
            }
        });

        if (pageNum === 2) {
            startTypewriterPage2();
        } else if (introAnimatedPages.has(pageNum)) {
            startIntroAnimation(pageNum, mjPromise);
        } else if (answerAnimatedPages.has(pageNum)) {
            startAnswerAnimation(pageNum, mjPromise);
        }

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
    if (e.key === ' ') {
        e.preventDefault();
        if (typewriterWaiting) {
            continueTypewriter();
        } else {
            changePage(1);
        }
    } else if (e.key === 'ArrowRight') {
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
