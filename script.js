document.addEventListener('DOMContentLoaded', () => {
    // Create auth manager instance
    const auth = new AuthManager();

    // --- DOM Elements ---
    const body = document.body; const themeToggle = document.querySelector('.theme-toggle'); const mobileMenuBtn = document.querySelector('.mobile-menu-btn'); const nav = document.querySelector('nav'); const vocabModal = document.getElementById('vocabModal'); const vocabClose = document.querySelector('.vocab-close'); const vocabList = document.getElementById('vocabList'); const imageViewerModal = document.getElementById('imageViewerModal'); const viewerClose = imageViewerModal.querySelector('.viewer-close'); const viewerTitleLabel = document.getElementById('viewerTitleLabel'); const imagePrevPageBtn = document.getElementById('imagePrevPage'); const imageNextPageBtn = document.getElementById('imageNextPage'); const imagePageInfo = document.getElementById('imagePageInfo'); const imageZoomInBtn = document.getElementById('imageZoomIn'); const imageZoomOutBtn = document.getElementById('imageZoomOut'); const imageToolbarVocabBtn = document.getElementById('imageToolbarVocabBtn'); const imageFullscreenBtn = document.getElementById('imageFullscreenBtn'); const comicImageViewer = document.getElementById('comicImageViewer'); const imageLoaderInline = document.getElementById('imageLoaderInline'); const imageLoadError = document.getElementById('image-load-error'); const copyrightYear = document.getElementById('copyright-year'); const searchInput = document.getElementById('comicSearchInput'); const comicsListContainer = document.getElementById('comicsList'); const noResultsMessage = document.getElementById('noResultsMessage'); const loadErrorMessage = document.getElementById('loadErrorMessage');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');
    const subscriptionModal = document.getElementById('subscriptionModal');
    const subscriptionLoginForm = document.getElementById('subscriptionLoginForm');
    const guestAccessBtn = document.getElementById('guestAccessBtn');
    const subscribeBtns = document.querySelectorAll('.subscribe-btn');

    // --- Global State ---
    let allComicsData = []; let allVocabularyData = {}; let currentImageIndex = 0; let totalImagePages = 0; let currentImageUrls = []; let currentImageScale = 1.0; const minImageScale = 0.2; const maxImageScale = 5.0; let currentComicIdForViewer = null; const synth = window.speechSynthesis; let currentUtterance = null; let searchDebounceTimeout;
    const itemsPerPage = 12; // Show 12 comics per page
    let currentPage = 1;
    let filteredComics = [];

    // --- Initial Setup ---
    if (copyrightYear) { copyrightYear.textContent = new Date().getFullYear(); }
    applyTheme(localStorage.getItem('darkMode') === 'true');
    loadDataAndInitialize();

    // --- Data Loading ---
    async function loadDataAndInitialize() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            const data = await response.json();
            allComicsData = data.comics || [];
            allVocabularyData = data.vocabulary || {};
            console.log("Data loaded successfully:", { comics: allComicsData.length, vocabs: Object.keys(allVocabularyData).length });
            displayComics(allComicsData);
            setupEventListeners();
        } catch (error) {
            console.error("Failed to load or parse data.json:", error);
            loadErrorMessage.style.display = 'block';
        }
    }

    // --- Access Control Functions ---
    function checkComicAccess(comic) {
        return auth.checkAccess(comic);
    }

    // --- Modal Functions ---
    function openSubscriptionModal(comic) {
        subscriptionModal.classList.add('active');
    }

    function closeSubscriptionModal() {
        subscriptionModal.classList.remove('active');
    }

    // --- UI Population ---
    function displayComics(comics) {
        comicsListContainer.innerHTML = '';
        noResultsMessage.style.display = 'none';
        filteredComics = comics;

        if (!comics || comics.length === 0) {
            if (searchInput.value.trim()) {
                noResultsMessage.textContent = "No comics found matching your search.";
            } else {
                noResultsMessage.textContent = "No comics available.";
            }
            noResultsMessage.style.display = 'block';
            updatePaginationControls(0);
            return;
        }

        const totalPages = Math.ceil(comics.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, comics.length);
        const comicsToShow = comics.slice(startIndex, endIndex);

        comicsToShow.forEach(comic => {
            const card = document.createElement('div');
            card.className = 'comic-card';
            if (comic.locked) card.classList.add('locked');
            card.dataset.comicId = comic.id;
            card.dataset.vocabId = comic.vocabId;
            card.dataset.title = comic.title;
            card.dataset.description = comic.description;
            
            card.innerHTML = `
                <img src="${comic.coverImage || 'https://via.placeholder.com/400x300/cccccc/999999?text=No+Image'}" alt="${comic.title} Cover" class="comic-image">
                <div class="comic-info">
                    <div> <h3 class="comic-title">${comic.title}</h3> <span class="comic-level ${comic.level || ''}">${comic.level || 'Unknown'}</span> <p class="comic-description">${comic.description}</p> </div>
                    <div class="comic-actions"> <a href="#" class="comic-link" data-comic-id="${comic.id}">${comic.locked ? 'Subscribe to Read' : 'Read Now'}</a> <button class="vocab-assistant-btn" data-vocab-id="${comic.vocabId}" aria-label="Open Vocabulary for ${comic.title}"><i class="fas fa-book"></i></button> </div>
                </div>`;
            comicsListContainer.appendChild(card);
        });

        updatePaginationControls(totalPages);
        checkScrollAnimation();
        updateComicAccessUI();
    }

    function updatePaginationControls(totalPages) {
        currentPageSpan.textContent = totalPages > 0 ? currentPage : 0;
        totalPagesSpan.textContent = totalPages;
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
    }

    function updateComicAccessUI() {
        document.querySelectorAll('.comic-card').forEach(card => {
            const comicId = card.dataset.comicId;
            const comic = allComicsData.find(c => c.id === comicId);
            if (comic?.locked) {
                card.classList.add('locked');
                const readButton = card.querySelector('.comic-link');
                if (!checkComicAccess(comic)) {
                    readButton.href = 'pages/login.html';
                    readButton.textContent = 'Subscribe to Read';
                }
            }
        });
    }

    // --- Theme Toggle & Mobile Menu Logic ---
    function applyTheme(isDarkMode) { const icon = themeToggle.querySelector('i'); if (isDarkMode) { body.classList.add('dark-mode'); icon.classList.replace('fa-moon', 'fa-sun'); themeToggle.setAttribute('aria-label', 'Switch to light mode'); } else { body.classList.remove('dark-mode'); icon.classList.replace('fa-sun', 'fa-moon'); themeToggle.setAttribute('aria-label', 'Switch to dark mode'); } }
    function closeMobileMenu() { if (nav.classList.contains('active')) { nav.classList.remove('active'); mobileMenuBtn.setAttribute('aria-expanded', 'false'); mobileMenuBtn.querySelector('i').classList.replace('fa-times', 'fa-bars'); } }


    // --- Vocabulary Data & TTS Logic ---
    function getVocabIdForComic(comicId) { return comicId ? comicId.replace('comic', 'vocab') : null; }
    function speakWord(word, buttonElement) { if (!synth) { alert("Sorry, your browser doesn't support Text-to-Speech."); return; } if (synth.speaking) { synth.cancel(); document.querySelectorAll('.play-audio-btn.playing').forEach(btn => btn.classList.remove('playing'));} const utterance = new SpeechSynthesisUtterance(word); currentUtterance = utterance; utterance.lang = 'en-US'; utterance.pitch = 1; utterance.rate = 1; utterance.onstart = () => { buttonElement?.classList.add('playing'); }; utterance.onend = () => { buttonElement?.classList.remove('playing'); currentUtterance = null; }; utterance.onerror = (event) => { console.error('SpeechSynthesisUtterance.onerror', event); alert(`Speech error: ${event.error}`); buttonElement?.classList.remove('playing'); currentUtterance = null; }; synth.speak(utterance); }
    function openVocabModal(vocabId) {
        const vocabData = allVocabularyData[vocabId] || allVocabularyData['not_found'];
        const comicId = vocabId ? vocabId.replace('vocab', 'comic') : null;
        const comic = allComicsData.find(c => c.id === comicId);
        const comicTitle = comic?.title || 'Comic';
        vocabList.innerHTML = '';
        if (!vocabData || vocabData.length === 0) { const li = document.createElement('li'); li.className = 'vocab-item'; li.textContent = 'No vocabulary available.'; vocabList.appendChild(li); }
        else {
            vocabData.forEach(item => {
                const li = document.createElement('li'); li.className = 'vocab-item';
                // Only show button if word exists
                const ttsButtonHtml = item.word ? `<button class="play-audio-btn" data-word="${item.word}" aria-label="Speak word: ${item.word}" title="Speak word"><i class="fas fa-volume-up" aria-hidden="true"></i></button>` : '';
                li.innerHTML = `<div class="vocab-word-container"><span class="vocab-word">${item.word || 'N/A'}</span>${ttsButtonHtml}</div> ${item.pronunciation ? `<div class="pronunciation">${item.pronunciation}</div>` : ''} <div class="vocab-definition">${item.definition || ''}</div> ${item.example ? `<div class="vocab-example"><em>Example:</em> ${item.example}</div>` : ''}`; vocabList.appendChild(li);
            });
        }
        document.getElementById('vocabTitle').textContent = `Vocabulary: ${comicTitle}`;
        vocabModal.classList.add('active');
        vocabClose.focus(); // Focus management
    }
    function closeVocabModalAction() { if (synth && synth.speaking) { synth.cancel(); } vocabModal.classList.remove('active'); }

    // --- Image Viewer State & Functions ---
    // ** CORRECTED ** updateImageViewerControls
    function updateImageViewerControls() {
        if (totalImagePages <= 0) { // No comic loaded
            imagePrevPageBtn.disabled = true; imageNextPageBtn.disabled = true; imageZoomOutBtn.disabled = true; imageZoomInBtn.disabled = true; imageFullscreenBtn.disabled = true; imageToolbarVocabBtn.disabled = true; imagePageInfo.textContent = 'Page ? of ?'; return;
        }
        imagePrevPageBtn.disabled = (currentImageIndex <= 0);
        imageNextPageBtn.disabled = (currentImageIndex >= totalImagePages - 1);
        imageZoomOutBtn.disabled = (currentImageScale <= minImageScale + 0.01);
        imageZoomInBtn.disabled = (currentImageScale >= maxImageScale - 0.01);
        imageFullscreenBtn.disabled = false;

        // Correctly enable/disable vocab button
        const vocabId = getVocabIdForComic(currentComicIdForViewer);
        const vocabDataExists = vocabId && allVocabularyData[vocabId] && allVocabularyData[vocabId].length > 0 && !(allVocabularyData[vocabId].length === 1 && allVocabularyData[vocabId][0].word === 'N/A'); // Ensure it's not just the placeholder
        imageToolbarVocabBtn.disabled = !vocabDataExists; // Disable IF data does NOT exist

        imagePageInfo.textContent = `Page ${currentImageIndex + 1} of ${totalImagePages}`;
    }

    function loadImagePage(index) { if (index < 0 || index >= totalImagePages) return; currentImageIndex = index; const imageUrl = currentImageUrls[index]; imageLoaderInline.classList.add('active'); comicImageViewer.style.display = 'none'; imageLoadError.style.display = 'none'; const img = new Image(); img.onload = () => { comicImageViewer.src = imageUrl; comicImageViewer.style.display = 'block'; applyImageZoom(currentImageScale); imageLoaderInline.classList.remove('active'); updateImageViewerControls(); preloadNextImage(index + 1); }; img.onerror = () => { console.error("Failed to load image:", imageUrl); imageLoadError.textContent = `Failed to load page ${index + 1}. Path: ${imageUrl}`; imageLoadError.style.display = 'block'; imageLoaderInline.classList.remove('active'); updateImageViewerControls(); }; img.src = imageUrl; }
    function preloadNextImage(index) { if (index >= 0 && index < totalImagePages) { const nextUrl = currentImageUrls[index]; if (nextUrl) { const preloadImg = new Image(); preloadImg.src = nextUrl; } } }
    function applyImageZoom(scale) { currentImageScale = Math.max(minImageScale, Math.min(maxImageScale, scale)); comicImageViewer.style.transform = `scale(${currentImageScale})`; updateImageViewerControls(); }
    function imageZoomIn() { applyImageZoom(currentImageScale + 0.25); }
    function imageZoomOut() { applyImageZoom(currentImageScale - 0.25); }
    function goToNextImagePage() { if (currentImageIndex < totalImagePages - 1) { loadImagePage(currentImageIndex + 1); } }
    function goToPrevImagePage() { if (currentImageIndex > 0) { loadImagePage(currentImageIndex - 1); } }
    function openImageViewerModal(comicId) {
        const comicData = allComicsData.find(c => c.id === comicId);
        if (!comicData || !comicData.imageData || comicData.imageData.pageCount <= 0) { alert(`Sorry, image data for comic '${comicData?.title || comicId}' is not configured correctly.`); return; }
        const imageData = comicData.imageData; const comicTitle = comicData.title || 'Comic'; currentImageUrls = []; const prefix = imageData.filenamePrefix === undefined ? 'page_' : imageData.filenamePrefix; const padding = imageData.pageNumberPadding === undefined ? 3 : imageData.pageNumberPadding; const format = imageData.imageFormat || 'jpg';
        for (let i = 1; i <= imageData.pageCount; i++) { const pageNumFormatted = String(i).padStart(padding, '0'); currentImageUrls.push(`${imageData.basePath}${prefix}${pageNumFormatted}.${format}`); }
        totalImagePages = imageData.pageCount; currentImageIndex = 0; currentImageScale = 1.0; currentComicIdForViewer = comicId;
        viewerTitleLabel.textContent = comicTitle; imageLoadError.style.display = 'none'; comicImageViewer.style.transform = 'scale(1)'; updateImageViewerControls(); imageViewerModal.classList.add('active'); loadImagePage(currentImageIndex); viewerClose.focus();
    }
    function closeImageViewerModal() { imageViewerModal.classList.remove('active'); if (synth && synth.speaking) { synth.cancel(); } if (document.fullscreenElement === imageViewerModal) { document.exitFullscreen(); } currentImageUrls = []; totalImagePages = 0; currentImageIndex = 0; currentImageScale = 1.0; currentComicIdForViewer = null; comicImageViewer.src = ""; comicImageViewer.style.transform = 'scale(1)'; imageLoadError.style.display = 'none'; updateImageViewerControls(); }

    // --- Live Search Logic ---
    function filterComics() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        noResultsMessage.style.display = 'none';
        
        const filtered = allComicsData.filter(comic => {
            const title = comic.title?.toLowerCase() || '';
            const description = comic.description?.toLowerCase() || '';
            return title.includes(searchTerm) || description.includes(searchTerm);
        });
        
        displayComics(filtered);
        noResultsMessage.style.display = (filtered.length === 0 && searchTerm) ? 'block' : 'none';
    }

    // --- Setup Event Listeners (Called after data load) ---
    function setupEventListeners() {
        themeToggle.addEventListener('click', () => { const isDarkMode = !body.classList.contains('dark-mode'); applyTheme(isDarkMode); localStorage.setItem('darkMode', isDarkMode); });
        mobileMenuBtn.addEventListener('click', () => { const isActive = nav.classList.toggle('active'); mobileMenuBtn.setAttribute('aria-expanded', isActive); mobileMenuBtn.querySelector('i').classList.toggle('fa-bars', !isActive); mobileMenuBtn.querySelector('i').classList.toggle('fa-times', isActive); });
        document.addEventListener('click', (e) => { if (nav.classList.contains('active') && !nav.contains(e.target) && !mobileMenuBtn.contains(e.target)) { closeMobileMenu(); } });
        nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMobileMenu));
        vocabClose.addEventListener('click', closeVocabModalAction);
        window.addEventListener('click', (e) => { if (e.target === vocabModal) { closeVocabModalAction(); } });

        // Event Delegation for dynamic elements
        comicsListContainer.addEventListener('click', (e) => {
            const link = e.target.closest('.comic-link');
            const vocabBtn = e.target.closest('.vocab-assistant-btn');
            if (link) {
                e.preventDefault();
                const comicId = link.dataset.comicId;
                const comic = allComicsData.find(c => c.id === comicId);
                
                if (comic && comic.locked && (!auth.currentUser || auth.isGuest)) {
                    openSubscriptionModal(comic);
                } else {
                    openImageViewerModal(comicId);
                }
            } else if (vocabBtn) { e.preventDefault(); e.stopPropagation(); openVocabModal(vocabBtn.dataset.vocabId); }
        });

        vocabList.addEventListener('click', (e) => { const audioButton = e.target.closest('.play-audio-btn'); if (audioButton) { const wordToSpeak = audioButton.dataset.word; if (wordToSpeak) { speakWord(wordToSpeak, audioButton); } } });
        imagePrevPageBtn.addEventListener('click', goToPrevImagePage); imageNextPageBtn.addEventListener('click', goToNextImagePage); imageZoomInBtn.addEventListener('click', imageZoomIn); imageZoomOutBtn.addEventListener('click', imageZoomOut); viewerClose.addEventListener('click', closeImageViewerModal);
        imageToolbarVocabBtn.addEventListener('click', () => { if (imageToolbarVocabBtn.disabled) return; const showVocab = () => { if (!currentComicIdForViewer) { openVocabModal('not_found'); return; } const vocabId = getVocabIdForComic(currentComicIdForViewer); openVocabModal(vocabId || 'not_found'); }; if (document.fullscreenElement === imageViewerModal) { document.exitFullscreen().then(() => { setTimeout(showVocab, 150); }).catch(err => { console.error("Error exiting fullscreen:", err); showVocab(); }); } else { showVocab(); } });
        imageFullscreenBtn.addEventListener('click', () => { if (imageFullscreenBtn.disabled) return; if (!document.fullscreenElement) { imageViewerModal.requestFullscreen().catch(err => { alert(`Error attempting fullscreen: ${err.message}`); }); } else { if (document.exitFullscreen) { document.exitFullscreen(); } } });
        document.addEventListener('fullscreenchange', () => { const icon = imageFullscreenBtn.querySelector('i'); const isFullscreen = document.fullscreenElement === imageViewerModal; icon.classList.toggle('fa-expand', !isFullscreen); icon.classList.toggle('fa-compress', isFullscreen); imageFullscreenBtn.setAttribute('aria-label', isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (vocabModal.classList.contains('active')) { closeVocabModalAction(); e.preventDefault(); } else if (imageViewerModal.classList.contains('active')) { closeImageViewerModal(); e.preventDefault(); } return; } if (!imageViewerModal.classList.contains('active')) return; let handled = false; switch (e.key) { case 'ArrowLeft': goToPrevImagePage(); handled = true; break; case 'ArrowRight': goToNextImagePage(); handled = true; break; case '+': case '=': if (e.ctrlKey || e.metaKey) { imageZoomIn(); handled = true; } break; case '-': if (e.ctrlKey || e.metaKey) { imageZoomOut(); handled = true; } break; case 'f': imageFullscreenBtn.click(); handled = true; break; case 'v': imageToolbarVocabBtn.click(); handled = true; break; } if (handled) { e.preventDefault(); } });
        searchInput.addEventListener('input', () => {
            currentPage = 1; // Reset to first page on new search
            clearTimeout(searchDebounceTimeout);
            searchDebounceTimeout = setTimeout(filterComics, 300);
        });

        // Pagination Controls
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displayComics(filteredComics);
                window.scrollTo({top: 0, behavior: 'smooth'});
            }
        });

        nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredComics.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                displayComics(filteredComics);
                window.scrollTo({top: 0, behavior: 'smooth'});
            }
        });

        // Smooth Scroll & Scroll Animation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => { anchor.addEventListener('click', function(e) { const href = this.getAttribute('href'); if (!href || href === '#') return; const targetId = href.substring(1); if (!targetId) return; const targetElement = document.getElementById(targetId); if (!targetElement) return; e.preventDefault(); const headerOffset = document.querySelector('header')?.offsetHeight || 70; const elementPosition = targetElement.getBoundingClientRect().top; const offsetPosition = elementPosition + window.pageYOffset - headerOffset; window.scrollTo({ top: offsetPosition, behavior: 'smooth' }); closeMobileMenu(); }); });
        checkScrollAnimation();
        window.addEventListener('scroll', checkScrollAnimation);

        // Subscription modal event listeners
        if (subscriptionLoginForm) {
            subscriptionLoginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = e.target.elements.username.value;
                const pin = e.target.elements.pin.value;
                
                const result = await auth.login(username, pin);
                if (result.success) {
                    closeSubscriptionModal();
                    displayComics(allComicsData);
                } else {
                    alert(result.error);
                }
            });
        }

        if (guestAccessBtn) {
            guestAccessBtn.addEventListener('click', () => {
                auth.setGuest();
                closeSubscriptionModal();
                displayComics(allComicsData);
            });
        }

        subscribeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const plan = btn.dataset.plan;
                // Implement subscription purchase flow
                alert(`Subscription purchase for ${plan} plan will be implemented here.`);
            });
        });

        const subscriptionClose = document.querySelector('.subscription-close');
        if (subscriptionClose) {
            subscriptionClose.addEventListener('click', closeSubscriptionModal);
        }
        
        // Close on outside click
        subscriptionModal.addEventListener('click', (e) => {
            if (e.target === subscriptionModal) {
                closeSubscriptionModal();
            }
        });
    }

    // --- Scroll Animation Logic ---
    let intersectionObserver; // Keep observer reference
    function checkScrollAnimation() {
        const cardsToObserve = document.querySelectorAll('#comicsList .comic-card:not(.is-visible)');
        if (cardsToObserve.length === 0) {
            // Optional: Disconnect observer if all cards are visible
            if (intersectionObserver) {
                // console.log("Disconnecting scroll observer.");
                // intersectionObserver.disconnect();
                // intersectionObserver = null; // Clear reference
            }
             return; // No cards left to observe
        }

        if ('IntersectionObserver' in window) {
            if (!intersectionObserver) { // Initialize observer only once if needed
                // console.log("Initializing scroll observer.");
                 intersectionObserver = new IntersectionObserver((entries, observerInstance) => {
                     entries.forEach(entry => {
                         if (entry.isIntersecting) {
                             entry.target.classList.add('is-visible');
                             observerInstance.unobserve(entry.target);
                         }
                     });
                 }, { threshold: 0.1 });
             }
             // Observe newly added or currently non-visible cards
             cardsToObserve.forEach(card => intersectionObserver.observe(card));
         } else { // Fallback for older browsers
             const triggerBottom = window.innerHeight * 0.85;
             cardsToObserve.forEach(card => {
                 const cardTop = card.getBoundingClientRect().top;
                 if (cardTop < triggerBottom) {
                     card.classList.add('is-visible');
                 }
             });
         }
    }

}); // End DOMContentLoaded