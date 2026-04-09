// useLeaderboard hook - uses scoreStorage service
import { useState, useEffect, useCallback } from 'react';
import { getHighScores, getStats } from '../services/scoreStorage';

export function useLeaderboard() {
    const [scores, setScores] = useState([]);
    const [stats, setStats] = useState(null);

    // Load scores on mount
    useEffect(() => {
        const loadedScores = getHighScores();
        setScores(loadedScores);
        setStats(getStats());
    }, []);

    // Refresh scores
    const refresh = useCallback(() => {
        setScores(getHighScores());
        setStats(getStats());
    }, []);

    // Get top N scores
    const getTopScores = useCallback((count = 10) => {
        return scores.slice(0, count);
    }, [scores]);

    // Get scores by category
    const getScoresByCategory = useCallback((category) => {
        return scores.filter(s => s.category === category);
    }, [scores]);

    // Get scores by difficulty
    const getScoresByDifficulty = useCallback((difficulty) => {
        return scores.filter(s => s.difficulty === difficulty);
    }, [scores]);

    return {
        scores,
        stats,
        getTopScores,
        getScoresByCategory,
        getScoresByDifficulty,
        refresh
    };
}

export default useLeaderboard;
