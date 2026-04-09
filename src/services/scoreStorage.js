// Score Storage Service - Local storage for game scores and history

const STORAGE_KEYS = {
    HIGH_SCORES: 'football_quiz_high_scores',
    GAME_HISTORY: 'football_quiz_game_history',
    STATS: 'football_quiz_stats'
};

const MAX_HISTORY = 50;
const MAX_HIGH_SCORES = 10;

// Get high scores
export function getHighScores() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.HIGH_SCORES);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

// Save a new score
export function saveScore(score, category, difficulty, accuracy, correctAnswers, totalQuestions) {
    const scores = getHighScores();

    const newScore = {
        id: Date.now(),
        playerName: localStorage.getItem('quiz_username') || 'Anonymous',
        score,
        category,
        difficulty,
        accuracy,
        correctAnswers,
        totalQuestions,
        date: new Date().toISOString()
    };

    scores.push(newScore);

    // Sort by score descending and keep top scores
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, MAX_HIGH_SCORES);

    localStorage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(topScores));

    // Also save to history
    saveToHistory(newScore);

    // Update stats
    updateStats(newScore);

    // Return rank (1-indexed)
    const rank = topScores.findIndex(s => s.id === newScore.id);
    return {
        isHighScore: rank !== -1,
        rank: rank !== -1 ? rank + 1 : null,
        newScore
    };
}

// Get best score for a category/difficulty combination
export function getBestScore(category, difficulty) {
    const scores = getHighScores();
    const filtered = scores.filter(s => s.category === category && s.difficulty === difficulty);
    return filtered.length > 0 ? filtered[0] : null;
}

// Get game history
export function getGameHistory() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.GAME_HISTORY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

// Save to game history
function saveToHistory(game) {
    const history = getGameHistory();
    history.unshift(game);

    // Keep only recent games
    const trimmed = history.slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEYS.GAME_HISTORY, JSON.stringify(trimmed));
}

// Get player statistics
export function getStats() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.STATS);
        return stored ? JSON.parse(stored) : {
            totalGames: 0,
            totalScore: 0,
            totalCorrect: 0,
            totalQuestions: 0,
            bestStreak: 0,
            favoriteCategory: null,
            gamesPerCategory: {},
            gamesPerDifficulty: {}
        };
    } catch {
        return {
            totalGames: 0,
            totalScore: 0,
            totalCorrect: 0,
            totalQuestions: 0,
            bestStreak: 0,
            favoriteCategory: null,
            gamesPerCategory: {},
            gamesPerDifficulty: {}
        };
    }
}

// Update statistics
function updateStats(game) {
    const stats = getStats();

    stats.totalGames++;
    stats.totalScore += game.score;
    stats.totalCorrect += game.correctAnswers;
    stats.totalQuestions += game.totalQuestions;

    // Track games per category
    stats.gamesPerCategory[game.category] = (stats.gamesPerCategory[game.category] || 0) + 1;

    // Track games per difficulty
    stats.gamesPerDifficulty[game.difficulty] = (stats.gamesPerDifficulty[game.difficulty] || 0) + 1;

    // Find favorite category
    const categories = Object.entries(stats.gamesPerCategory);
    if (categories.length > 0) {
        stats.favoriteCategory = categories.sort((a, b) => b[1] - a[1])[0][0];
    }

    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
}

// Update best streak
export function updateBestStreak(streak) {
    const stats = getStats();
    if (streak > stats.bestStreak) {
        stats.bestStreak = streak;
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    }
}

// Clear all data
export function clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.HIGH_SCORES);
    localStorage.removeItem(STORAGE_KEYS.GAME_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.STATS);
}

// Get average accuracy
export function getAverageAccuracy() {
    const stats = getStats();
    if (stats.totalQuestions === 0) return 0;
    return Math.round((stats.totalCorrect / stats.totalQuestions) * 100);
}

// Get average score per game
export function getAverageScore() {
    const stats = getStats();
    if (stats.totalGames === 0) return 0;
    return Math.round(stats.totalScore / stats.totalGames);
}

export default {
    getHighScores,
    saveScore,
    getBestScore,
    getGameHistory,
    getStats,
    updateBestStreak,
    clearAllData,
    getAverageAccuracy,
    getAverageScore
};
