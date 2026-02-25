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
const answerAnimatedPages = new Set([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29]);
const answerOriginals = {};
let answerAnimationId = 0;

// Intro div animation — add page numbers here to opt in
const introAnimatedPages = new Set([]);
const introOriginals = {};

// Pages where the intro div auto-animates alongside/after the answer animation.
// Map: pageNum → delay ms after click (null = fire via onComplete, i.e. after all wipes)
const introChainPages = new Map([[3, 2000], [11, null], [16, null], [20, null]]);

// Per-page override for the gap (ms) between display math wipes (default: 3500)
const displayGapOverrides = new Map([[3, 4000], [7, 1500], [9, 1500], [14, 1500], [18, 1500]]);

// Per-page override for display math wipe speed in px/s (default: 75)
const displaySpeedOverrides = new Map();

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
        const delay = /\S/.test(item.char) ? 50 : 0;
        typewriterTimeout = setTimeout(tick, delay);
    }
    tick();
}

function startTypewriterPage2(mjPromise) {
    const page = document.getElementById('page-2');
    if (!page) return;

    stopTypewriter();

    const introEl = page.querySelector('.intro');
    if (!introEl) return;

    // Hide exercise initially; reveal when intro animation completes
    const exerciseEl = page.querySelector('.exercise');
    if (exerciseEl) exerciseEl.style.display = 'none';

    // Save pre-MathJax HTML on first visit; restore it on subsequent visits
    if (page2Originals === null) {
        page2Originals = introEl.innerHTML;
    } else {
        introEl.innerHTML = page2Originals;
    }

    // Hide intro while MathJax renders to avoid a flash of raw LaTeX
    introEl.style.visibility = 'hidden';

    const myId = ++answerAnimationId;

    (mjPromise || Promise.resolve()).then(() => {
        if (myId !== answerAnimationId) return;
        introEl.style.visibility = '';
        const onComplete = () => {
            if (myId !== answerAnimationId) return;
            if (exerciseEl) exerciseEl.style.display = '';
        };
        runAnswerAnimation(introEl, myId, onComplete);
    });
}

function startAnswerAnimation(pageNum, mjPromise) {
    const page = document.getElementById('page-' + pageNum);
    const answers = page ? Array.from(page.querySelectorAll('.answer, .key-concept')) : [];
    if (answers.length === 0) return;

    // Check if this page also chains an intro animation after/alongside the answer
    const introDelay = introChainPages.has(pageNum) ? introChainPages.get(pageNum) : undefined;
    const introEl = introDelay !== undefined ? page.querySelector('.intro') : null;
    if (introEl) introEl.style.display = 'none';

    // Hide elements that should appear only after the answer animation completes.
    // Includes explicitly marked .after-answer elements, plus any .exercise or .intro
    // that follows the last answer in document order (excluding intros already managed
    // by introChainPages, which have their own timing).
    const lastAnswer = answers[answers.length - 1];
    const afterAnswerEls = [
        ...Array.from(page.querySelectorAll('.after-answer')),
        ...Array.from(page.querySelectorAll('.exercise, .intro')).filter(el =>
            el !== introEl &&
            !lastAnswer.contains(el) &&
            (lastAnswer.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
        ),
    ];
    afterAnswerEls.forEach(el => { el.style.display = 'none'; });

    // Save the original (pre-MathJax) HTML on first visit; restore it on subsequent visits
    answers.forEach((answer, i) => {
        const key = pageNum + '.' + i;
        if (!answerOriginals[key]) {
            answerOriginals[key] = answer.innerHTML;
        } else {
            answer.innerHTML = answerOriginals[key];
        }
    });
    if (introEl) {
        if (!introOriginals[pageNum]) {
            introOriginals[pageNum] = introEl.innerHTML;
        } else {
            introEl.innerHTML = introOriginals[pageNum];
        }
    }

    // Hide all boxes while MathJax renders to avoid a flash of raw LaTeX
    answers.forEach(answer => { answer.style.visibility = 'hidden'; });

    const myId = ++answerAnimationId;

    // Wait for MathJax, then blank the content and show the prompt inside the first green box
    (mjPromise || Promise.resolve()).then(() => {
        if (myId !== answerAnimationId) return;
        // Save the MathJax-rendered HTML for each answer
        const renderedList = answers.map(answer => answer.innerHTML);
        const renderedIntro = introEl ? introEl.innerHTML : null;
        // Blank all answers and reveal the (now empty) first box
        answers.forEach(answer => { answer.innerHTML = ''; answer.style.visibility = ''; });

        const runOptions = displayGapOverrides.has(pageNum) ? { displayGap: displayGapOverrides.get(pageNum) } : {};
        if (wipesFirstPages.has(pageNum) && !page.hasAttribute('data-no-wipes-first')) runOptions.wipesFirst = true;
        if (displaySpeedOverrides.has(pageNum)) runOptions.displaySpeedPxSec = displaySpeedOverrides.get(pageNum);

        function animateFrom(idx) {
            if (myId !== answerAnimationId) return;
            const answer = answers[idx];
            const rendered = renderedList[idx];
            const isLast = idx === answers.length - 1;
            answer.innerHTML = rendered;
            const onComplete = isLast ? (() => {
                if (myId !== answerAnimationId) return;
                afterAnswerEls.forEach(el => { el.style.display = ''; });
                if (introEl && introDelay === null && renderedIntro !== null) {
                    introEl.innerHTML = renderedIntro;
                    introEl.style.display = '';
                    runAnswerAnimation(introEl, myId, null);
                }
            }) : (() => {
                setTimeout(() => animateFrom(idx + 1), 400);
            });
            runAnswerAnimation(answer, myId, onComplete, runOptions);
            // Fixed-delay chain: start intro at specified time after first answer starts
            if (idx === 0 && introEl && introDelay !== null && renderedIntro !== null) {
                setTimeout(() => {
                    if (myId !== answerAnimationId) return;
                    introEl.innerHTML = renderedIntro;
                    introEl.style.display = '';
                    runAnswerAnimation(introEl, myId, null);
                }, introDelay);
            }
        }

        // Auto-start: always animate immediately without waiting for user click
        animateFrom(0);
    });
}

function runAnswerAnimation(answer, myId, onComplete, options) {
    const cells = Array.from(answer.querySelectorAll('td'));

    const displayGap = (options && options.displayGap != null) ? options.displayGap : 3500;
    const wipesFirst = options && options.wipesFirst;
    const displaySpeedPxSec = (options && options.displaySpeedPxSec != null) ? options.displaySpeedPxSec : 75;

    // Walk all nodes in document order, building animation units.
    // MathJax moves display math (\[...\]) outside <p> elements to make it block-level,
    // so we must traverse the full tree rather than only <p> children, otherwise all
    // equations end up batched after all text.
    //   - text nodes           → char units (typed one by one)
    //   - mjx-container[display] → display wipe unit (left-to-right, with post-gap)
    //   - mjx-container (inline) → inline wipe unit (left-to-right, no post-gap)
    //   - block elements       → recurse; add a pause before if not already after a wipe
    //   - table / script / svg → skip (tables handled by animateCells)
    const units = [];

    const BLOCK_TAGS = new Set(['p','div','section','article','blockquote',
        'h1','h2','h3','h4','h5','h6','li','ul','ol','figure','figcaption']);
    const SKIP_TAGS  = new Set(['table','script','style','svg','mjx-assistive-mml']);

    function addPauseIfNeeded() {
        const last = units[units.length - 1];
        if (last && last.type !== 'wipe' && last.type !== 'pause') {
            units.push({ type: 'pause', duration: 400 });
        }
    }

    function walkNodes(nodeList) {
        Array.from(nodeList).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                node.textContent = '';
                for (let i = 0; i < text.length; i++) {
                    units.push({ type: 'char', node, char: text[i] });
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.tagName.toLowerCase();
                if (SKIP_TAGS.has(tag)) {
                    return;
                } else if (tag === 'mjx-container' && node.hasAttribute('display')) {
                    // Display math: wipe in at document position; post-gap separates it from
                    // whatever follows.
                    if (units.length > 0) addPauseIfNeeded();
                    const mtrRows = Array.from(node.querySelectorAll('g[data-mml-node="mtr"]'));
                    if (mtrRows.length > 1) {
                        // Multi-row aligned environment: wipe each row individually in sequence
                        // using SVG clip-path (same technique as the wipe animation).
                        const svgEl = node.querySelector('svg');
                        mtrRows.forEach((row, i) => {
                            units.push({ type: 'mtr-row', row, svgEl, rowIdx: i,
                                         gap: i < mtrRows.length - 1 ? 600 : displayGap });
                        });
                    } else {
                        units.push({ type: 'wipe', el: node, gap: displayGap, isInline: false });
                    }
                } else if (tag === 'mjx-container') {
                    // Inline math: wipe in seamlessly (gap = 0 so next char starts when
                    // the wipe finishes). Apply clip-path to the inner SVG (which is sized
                    // to the full formula bounds) rather than mjx-container (whose declared
                    // border-box may not include formula depth below the baseline).
                    const svgEl = node.querySelector('svg');
                    units.push({ type: 'wipe', el: svgEl || node, gap: 0, isInline: true });
                } else if (BLOCK_TAGS.has(tag)) {
                    // Block element: pause before (if needed), then recurse into children.
                    if (units.length > 0) addPauseIfNeeded();
                    walkNodes(node.childNodes);
                } else {
                    // Other inline elements (span, strong, em, …): if the element contains
                    // MathJax output (mjx-container), recurse into it so the math wipes
                    // correctly (e.g. <span class="math display"> wrappers from pandoc HTML).
                    // Otherwise reveal the element atomically.
                    if (node.querySelector('mjx-container')) {
                        walkNodes(node.childNodes);
                    } else {
                        node.style.visibility = 'hidden';
                        units.push({ type: 'element', node });
                    }
                }
            }
        });
    }

    walkNodes(answer.childNodes);

    // Hide mtr-row rows initially (via opacity so SVG geometry is preserved for getBBox).
    units.filter(u => u.type === 'mtr-row').forEach(u => { u.row.style.opacity = '0'; });

    // Set initial clip-path on all wipe units (display + inline math) and table cells.
    const wipeUnits = units.filter(u => u.type === 'wipe');
    const allWipeTargets = [
        ...wipeUnits.map(u => ({ el: u.el, isInline: u.isInline })),
        ...cells.map(el => ({ el, isInline: null })), // null = table cell
    ];
    allWipeTargets.forEach(({ el }) => {
        el.style.clipPath = 'inset(0 100% 0 0)';
        el.style.transition = 'none';
    });
    // Force reflow so the browser commits the initial clip-path before animating.
    // SVG widths are also available after this reflow.
    if (allWipeTargets.length > 0) allWipeTargets[0].el.getBoundingClientRect();
    // Set per-element transitions using measured SVG width for constant wipe speed.
    // Record each duration so delays can wait for the animation to finish.
    const wipeElDuration = new Map();
    allWipeTargets.forEach(({ el, isInline }) => {
        if (isInline === null) {
            // Table cell
            el.style.transition = 'clip-path 0.75s ease-out';
            wipeElDuration.set(el, 750);
        } else {
            // Math (display or inline): constant speed based on SVG width.
            // Inline math uses a lower minimum (narrower equations).
            const svgEl = el.querySelector('svg');
            const svgWidth = svgEl ? svgEl.getBoundingClientRect().width : el.getBoundingClientRect().width;
            const minMs = isInline ? 300 : 500;
            const ms = Math.max(minMs, (svgWidth / displaySpeedPxSec) * 1000);
            el.style.transition = `clip-path ${ms / 1000}s ease-out`;
            wipeElDuration.set(el, ms);
        }
    });

    let unitIdx = 0;
    let cellIdx = 0;

    // Pause before cells only if something visible was typed/wiped
    const hasTypedContent = units.some(
        u => (u.type === 'char' && /\S/.test(u.char)) || u.type === 'element' ||
             (u.type === 'wipe' && u.isInline)
    );

    function animateMtrRow(unit, onDone) {
        if (myId !== answerAnimationId) return;
        const { row, svgEl, rowIdx } = unit;
        let bbox;
        try { bbox = row.getBBox(); } catch(e) { row.style.opacity = '1'; onDone(); return; }
        if (!bbox.width) { row.style.opacity = '1'; onDone(); return; }
        let defs = svgEl ? svgEl.querySelector('defs') : null;
        if (svgEl && !defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svgEl.insertBefore(defs, svgEl.firstChild);
        }
        if (!defs) { row.style.opacity = '1'; onDone(); return; }
        const clipId = 'mtr-wipe-' + myId + '-' + rowIdx;
        const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipPath.setAttribute('id', clipId);
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', bbox.x);
        rect.setAttribute('y', bbox.y - 5);
        rect.setAttribute('height', bbox.height + 10);
        rect.setAttribute('width', '0');
        clipPath.appendChild(rect);
        defs.appendChild(clipPath);
        row.setAttribute('clip-path', 'url(#' + clipId + ')');
        row.style.opacity = '1';
        const targetWidth = bbox.width;
        // Convert SVG user units → CSS pixels for speed calculation (matching the
        // clip-path wipe which uses getBoundingClientRect on the svg element).
        const svgRect = svgEl.getBoundingClientRect();
        const svgVB = svgEl.viewBox ? svgEl.viewBox.baseVal : null;
        const scale = (svgVB && svgVB.width) ? svgRect.width / svgVB.width : 1;
        const ms = Math.max(500, (targetWidth * scale / displaySpeedPxSec) * 1000);
        let startTime = null;
        function step(ts) {
            if (myId !== answerAnimationId) return;
            if (!startTime) startTime = ts;
            const t = Math.min((ts - startTime) / ms, 1);
            rect.setAttribute('width', targetWidth * t);
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                row.removeAttribute('clip-path');
                if (clipPath.parentNode) clipPath.parentNode.removeChild(clipPath);
                onDone();
            }
        }
        requestAnimationFrame(step);
    }

    function animatePara() {
        if (myId !== answerAnimationId) return;
        if (unitIdx >= units.length) {
            typewriterTimeout = setTimeout(animateCells, hasTypedContent ? 400 : 0);
            return;
        }
        const unit = units[unitIdx++];
        if (unit.type === 'mtr-row') {
            // SVG row wipe — async, takes control of continuation
            animateMtrRow(unit, () => {
                typewriterTimeout = setTimeout(animatePara, unit.gap);
            });
            return;
        }
        let delay;
        if (unit.type === 'char') {
            unit.node.textContent += unit.char;
            delay = /\S/.test(unit.char) ? 50 : 0;
        } else if (unit.type === 'element') {
            unit.node.style.visibility = '';
            delay = 60;
        } else if (unit.type === 'wipe') {
            if (!wipesFirst || unit.isInline) {
                // Inline wipes always fire here (in document order).
                // Display wipes fire here in normal mode; in wipesFirst mode they were
                // already animated by doWipesFirst so we just skip them.
                unit.el.style.clipPath = 'inset(0 0% 0 0)';
                const wipeDuration = wipeElDuration.get(unit.el) || 0;
                if (unit.isInline) {
                    // Remove clip-path after transition so SVG overflow (formula depth
                    // extending beyond the element's border box) is not permanently cropped.
                    const el = unit.el;
                    setTimeout(() => { el.style.clipPath = ''; el.style.transition = ''; }, wipeDuration + 100);
                }
                delay = Math.max(unit.gap, wipeDuration);
            } else {
                delay = 0; // display wipe already done in wipesFirst phase
            }
        } else {
            // pause between paragraphs
            delay = unit.duration;
        }
        typewriterTimeout = setTimeout(animatePara, delay);
    }

    function animateCells() {
        if (myId !== answerAnimationId) return;
        if (cellIdx >= cells.length) {
            typewriterTimeout = null;
            if (onComplete) onComplete();
            return;
        }
        const el = cells[cellIdx++];
        el.style.clipPath = 'inset(0 0% 0 0)';
        typewriterTimeout = setTimeout(animateCells, 900);
    }

    if (wipesFirst) {
        // Wipe all DISPLAY math first (in document order), then table cells, then type text.
        // Inline math is excluded here — it wipes in document order during animatePara.
        const wipesInOrder = wipeUnits.filter(u => !u.isInline).map(u => ({ el: u.el, gap: u.gap }));
        const allWipesFirst = [
            ...wipesInOrder,
            ...cells.map(el => ({ el, gap: 900 })),
        ];
        let wfIdx = 0;
        function doWipesFirst() {
            if (myId !== answerAnimationId) return;
            if (wfIdx >= allWipesFirst.length) {
                // All display wipes done; now type the text (if any), which also handles
                // inline math wipes in document order.
                const hasText = units.some(u => u.type === 'char' || u.type === 'element' ||
                    (u.type === 'wipe' && u.isInline) || u.type === 'mtr-row');
                if (hasText) {
                    typewriterTimeout = setTimeout(animatePara, 400);
                } else {
                    typewriterTimeout = null;
                    if (onComplete) onComplete();
                }
                return;
            }
            const { el, gap } = allWipesFirst[wfIdx++];
            el.style.clipPath = 'inset(0 0% 0 0)';
            typewriterTimeout = setTimeout(doWipesFirst, Math.max(gap, wipeElDuration.get(el) || 0));
        }
        doWipesFirst();
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
            startTypewriterPage2(mjPromise);
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
