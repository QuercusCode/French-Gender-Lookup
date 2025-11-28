const searchInput = document.getElementById('wordInput');
const searchBtn = document.getElementById('searchBtn');
const randomBtn = document.getElementById('randomBtn');
const resultsArea = document.getElementById('resultsArea');
const recentSearchesContainer = document.getElementById('recentSearches');
const favoritesArea = document.getElementById('favoritesArea');
const favoritesList = document.getElementById('favoritesList');
const favBtn = document.getElementById('favBtn');
const closeFavBtn = document.getElementById('closeFavBtn');
let wordData = {};

// --- Favorites Logic ---
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

const saveFavoritesToStorage = () => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
};

const isFavorite = (word) => {
    return favorites.some(f => f.word.toLowerCase() === word.toLowerCase());
};

const toggleFavorite = (wordData) => {
    const index = favorites.findIndex(f => f.word.toLowerCase() === wordData.word.toLowerCase());
    if (index === -1) {
        favorites.push(wordData);
        showToast(`Added "${wordData.word}" to favorites`);
    } else {
        favorites.splice(index, 1);
        showToast(`Removed "${wordData.word}" from favorites`);
    }
    saveFavoritesToStorage();
    renderFavorites();
    // Re-render search results if visible to update heart icon
    const currentCard = document.querySelector(`.result-card[data-word="${wordData.word}"]`);
    if (currentCard) {
        const heartBtn = currentCard.querySelector('.fav-btn svg');
        if (heartBtn) {
            heartBtn.style.fill = index === -1 ? 'currentColor' : 'none';
            heartBtn.style.color = index === -1 ? '#e74c3c' : 'currentColor';
        }
    }
};

const renderFavorites = () => {
    favoritesList.innerHTML = '';
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p class="empty-msg">No favorites yet.</p>';
        return;
    }
    favorites.forEach(fav => {
        const item = document.createElement('div');
        item.className = 'fav-item';
        item.innerHTML = `
            <span class="fav-word" onclick="searchInput.value='${fav.word}'; searchWord('${fav.word}')">${fav.word}</span>
            <span class="fav-gender ${fav.genre}">${fav.genre === 'm' ? 'M' : 'F'}</span>
            <button class="remove-fav" onclick="event.stopPropagation(); toggleFavorite({word: '${fav.word}'})">&times;</button>
        `;
        favoritesList.appendChild(item);
    });
};

const showToast = (msg) => {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }, 10);
};


// --- Recent Searches Logic ---
const loadRecentSearches = () => {
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    recentSearchesContainer.innerHTML = '';
    recent.forEach(word => {
        const tag = document.createElement('span');
        tag.className = 'recent-tag';
        tag.textContent = word;
        tag.onclick = () => {
            searchInput.value = word;
            searchWord(word);
        };
        recentSearchesContainer.appendChild(tag);
    });
};

const saveRecentSearch = (word) => {
    let recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    // Remove if already exists to move it to the front
    recent = recent.filter(w => w.toLowerCase() !== word.toLowerCase());
    recent.unshift(word);
    // Keep only last 5
    if (recent.length > 5) recent.pop();
    localStorage.setItem('recentSearches', JSON.stringify(recent));
    if (recentSearches.length > 5) recentSearches.pop();
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    renderRecentSearches();
};

// --- Audio Logic ---
const playAudio = (text) => {
    // Try Google Translate TTS first for better quality
    const audio = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(text)}&tl=fr`);

    audio.play().catch(e => {
        console.warn('Google TTS failed, falling back to browser synthesis:', e);
        // Fallback to browser's built-in speech synthesis
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        window.speechSynthesis.speak(utterance);
    });
};

// --- Search Logic ---
const searchWord = async (queryWord = null) => {
    const word = queryWord || searchInput.value.trim();
    if (!word) return;

    // Clear previous results
    resultsArea.innerHTML = '';
    resultsArea.classList.remove('hidden');

    // Client-side lookup
    const lowerWord = word.toLowerCase();
    const gender = wordData[lowerWord];

    if (gender) {
        const result = {
            word: word, // Use original casing for display
            genre: gender
        };

        addToRecent(word); // Save successful search

        const card = document.createElement('div');
        card.className = `result-card ${result.genre === 'm' ? 'masculine' : 'feminine'}`;
        card.setAttribute('data-word', result.word);

        const genderClass = result.genre === 'm' ? 'gender-m' : 'gender-f';
        const genderText = result.genre === 'm' ? 'Masculine' : 'Feminine';

        // Simplified display based on new client-side data structure
        card.innerHTML = `
            <div class="word-info">
                <div class="word-header">
                    <span class="word-main">${result.word}</span>
                    <button class="audio-btn" onclick="playAudio('${result.word}')" title="Listen">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                    </button>
                </div>
                <div class="word-details"></div>
                <div class="word-meta"></div>
            </div>
            <div class="gender-badge ${genderClass}">${genderText}</div>
            <button class="fav-btn" onclick="toggleFavorite('${result.word}', '${result.genre}')" title="Toggle Favorite">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${isFavorite(result.word) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: ${isFavorite(result.word) ? '#e74c3c' : 'currentColor'}">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            </button>
        `;
        resultsArea.appendChild(card);
    } else {
        resultsArea.innerHTML = `
            <div class="result-card">
                <div class="no-result">No results found for "${word}".</div>
            </div>
        `;
    }
};

const getRandomWord = async () => {
    const keys = Object.keys(wordData);
    if (keys.length > 0) {
        const randomWord = keys[Math.floor(Math.random() * keys.length)];
        searchInput.value = randomWord;
        searchWord(randomWord);
    }
};

// Load Dictionary Data
const loadDictionary = async () => {
    try {
        console.log('Fetching words.json...');
        searchBtn.textContent = 'Loading...';
        searchBtn.disabled = true;

        // Use relative path explicitly
        const response = await fetch('./words.json');
        console.log('Fetch response status:', response.status, 'ok:', response.ok);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        wordData = await response.json();
        window.wordData = wordData; // Expose for debugging
        console.log('Dictionary loaded:', Object.keys(wordData).length, 'words');

        searchBtn.textContent = 'Search';
        searchBtn.disabled = false;
        showToast('Dictionary loaded successfully!');
    } catch (error) {
        console.error('Failed to load dictionary:', error);
        searchBtn.textContent = 'Error';
        alert('Failed to load dictionary. Please check your internet connection or try refreshing the page.\nError: ' + error.message);
        showToast('Error loading dictionary.');
    }
};

// --- Event Listeners ---
searchBtn.addEventListener('click', () => searchWord());
randomBtn.addEventListener('click', getRandomWord);

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchWord();
    }
});

// --- Quiz Logic ---
let quizScore = 0;
let currentQuizWord = null;
let lives = 3;
let xp = parseInt(localStorage.getItem('xp') || '0');
let level = parseInt(localStorage.getItem('level') || '1');

const quizModal = document.getElementById('quizModal');
const quizWordEl = document.getElementById('quizWord');
const quizFeedbackEl = document.getElementById('quizFeedback');
const streakCountEl = document.getElementById('streakCount');
const nextQuizBtn = document.getElementById('nextQuizBtn');
const quizOptions = document.querySelectorAll('.quiz-option');
const livesContainer = document.getElementById('livesContainer');
const levelBadge = document.getElementById('levelBadge');
const xpFill = document.getElementById('xpFill');
const xpText = document.getElementById('xpText');

const getLevelTitle = (lvl) => {
    if (lvl < 5) return 'Novice';
    if (lvl < 10) return 'Apprentice';
    if (lvl < 20) return 'Scholar';
    if (lvl < 30) return 'Expert';
    if (lvl < 50) return 'Master';
    return 'Academician';
};

const updateGamificationUI = () => {
    // Update Lives
    livesContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const heart = document.createElement('span');
        heart.className = `heart ${i < lives ? '' : 'lost'}`;
        heart.textContent = '❤️';
        livesContainer.appendChild(heart);
    }

    // Update Level & XP
    const xpForNextLevel = level * 100;
    const progress = (xp / xpForNextLevel) * 100;

    levelBadge.textContent = `Lvl ${level} ${getLevelTitle(level)}`;
    xpFill.style.width = `${Math.min(progress, 100)}%`;
    xpText.textContent = `${xp} / ${xpForNextLevel} XP`;

    // Save to storage
    localStorage.setItem('xp', xp);
    localStorage.setItem('level', level);
};

const startQuiz = () => {
    // Reset session state
    lives = 3;
    quizScore = 0;
    streakCountEl.textContent = quizScore;
    updateGamificationUI();

    quizModal.classList.remove('hidden');
    nextQuizQuestion();
};

const nextQuizQuestion = async () => {
    // Reset UI
    quizFeedbackEl.textContent = '';
    quizFeedbackEl.className = 'quiz-feedback';
    nextQuizBtn.classList.add('hidden');
    quizOptions.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('correct', 'wrong');
    });
    quizWordEl.textContent = 'Loading...';

    // Client-side random word
    const keys = Object.keys(wordData);
    if (keys.length > 0) {
        const randomWord = keys[Math.floor(Math.random() * keys.length)];
        const gender = wordData[randomWord];

        currentQuizWord = {
            word: randomWord,
            genre: gender
        };
        quizWordEl.textContent = currentQuizWord.word;
    } else {
        quizWordEl.textContent = 'Error loading word.';
    }
};

const checkAnswer = (selectedGender) => {
    if (!currentQuizWord) return;

    const correct = currentQuizWord.genre === selectedGender;

    quizOptions.forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.gender === currentQuizWord.genre) {
            btn.classList.add('correct');
        } else if (btn.dataset.gender === selectedGender && !correct) {
            btn.classList.add('wrong');
        }
    });

    if (correct) {
        // Correct Answer Logic
        quizScore++;
        streakCountEl.textContent = quizScore;

        // XP Gain
        const xpGain = 10 + (Math.floor(quizScore / 5) * 5); // Bonus for streaks
        xp += xpGain;

        // Level Up Check
        const xpForNextLevel = level * 100;
        if (xp >= xpForNextLevel) {
            xp -= xpForNextLevel;
            level++;
            showToast(`🎉 Level Up! You are now a ${getLevelTitle(level)}!`);
        }

        quizFeedbackEl.textContent = `Correct! +${xpGain} XP`;
        quizFeedbackEl.classList.add('success');
        playAudio(currentQuizWord.word);

        updateGamificationUI();
        nextQuizBtn.classList.remove('hidden');
    } else {
        // Wrong Answer Logic
        lives--;
        quizScore = 0; // Reset streak
        streakCountEl.textContent = quizScore;

        quizFeedbackEl.textContent = `Wrong! It's ${currentQuizWord.genre === 'm' ? 'Masculine' : 'Feminine'}.`;
        quizFeedbackEl.classList.add('error');

        updateGamificationUI();

        if (lives <= 0) {
            // Game Over
            setTimeout(() => {
                alert(`Game Over! You ran out of lives.\nFinal Streak: ${quizScore}`);
                startQuiz(); // Restart
            }, 1000);
        } else {
            nextQuizBtn.classList.remove('hidden');
        }
    }
};

// --- Theme Logic ---
const toggleTheme = () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
};

const updateThemeIcon = (isDark) => {
    const icon = themeToggle.querySelector('svg');
    if (isDark) {
        // Moon icon
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    } else {
        // Sun icon
        icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    }
};

const loadTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        updateThemeIcon(true);
    } else {
        updateThemeIcon(false);
    }
};

// Initialize
loadTheme();
loadRecentSearches();
renderFavorites();
loadDictionary();

// Favorites UI Handlers
favBtn.addEventListener('click', () => {
    favoritesArea.classList.remove('hidden');
    resultsArea.classList.add('hidden');
    renderFavorites();
});

closeFavBtn.addEventListener('click', () => {
    favoritesArea.classList.add('hidden');
    if (resultsArea.children.length > 0) {
        resultsArea.classList.remove('hidden');
    }
});

// Quiz UI Handlers
document.getElementById('quizBtn').addEventListener('click', startQuiz);
document.getElementById('closeQuizBtn').addEventListener('click', () => {
    quizModal.classList.add('hidden');
});
nextQuizBtn.addEventListener('click', nextQuizQuestion);

quizOptions.forEach(btn => {
    btn.addEventListener('click', () => checkAnswer(btn.dataset.gender));
});

themeToggle.addEventListener('click', toggleTheme);

// Make functions global so onclick works
window.playAudio = playAudio;
window.searchWord = searchWord;
window.toggleFavorite = toggleFavorite;
window.searchInput = searchInput;
