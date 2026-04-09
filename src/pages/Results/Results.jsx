import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import Button from '../../components/common/Button';
import { Card, CardBody } from '../../components/common/Card';
import Layout from '../../components/layout/Layout';
import { getHighScores, getStats } from '../../services/scoreStorage';
import './Results.css';

export function Results() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [results, setResults] = useState(null);
    const [animatedScore, setAnimatedScore] = useState(0);
    const [highScores, setHighScores] = useState([]);
    const [stats, setStats] = useState(null);
    const [isNewHighScore, setIsNewHighScore] = useState(false);
    const confettiTriggered = useRef(false);

    // Load results and high scores
    useEffect(() => {
        const stored = sessionStorage.getItem('quizResults');
        if (stored) {
            const parsed = JSON.parse(stored);
            setResults(parsed);

            // Load high scores
            const scores = getHighScores();
            setHighScores(scores);

            // Check if this is a new high score
            if (scores.length > 0 && scores[0].id === Date.now()) {
                setIsNewHighScore(true);
            }

            // Load stats
            setStats(getStats());
        } else {
            navigate('/');
        }
    }, [navigate]);

    // Animate score counting
    useEffect(() => {
        if (!results) return;

        const duration = 2000;
        const steps = 60;
        const increment = results.score / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= results.score) {
                setAnimatedScore(results.score);
                clearInterval(timer);
            } else {
                setAnimatedScore(Math.floor(current));
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [results]);

    // Trigger confetti for good scores
    useEffect(() => {
        if (!results || confettiTriggered.current) return;

        if (results.accuracy >= 70) {
            confettiTriggered.current = true;

            const count = 200;
            const defaults = {
                origin: { y: 0.7 },
                zIndex: 1000
            };

            function fire(particleRatio, opts) {
                confetti({
                    ...defaults,
                    ...opts,
                    particleCount: Math.floor(count * particleRatio)
                });
            }

            fire(0.25, { spread: 26, startVelocity: 55 });
            fire(0.2, { spread: 60 });
            fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
            fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
            fire(0.1, { spread: 120, startVelocity: 45 });
        }
    }, [results]);

    if (!results) {
        return null;
    }

    const getMessage = () => {
        if (results.accuracy >= 90) return { emoji: '🏆', text: t('results.excellent') };
        if (results.accuracy >= 70) return { emoji: '🌟', text: t('results.great') };
        if (results.accuracy >= 50) return { emoji: '👍', text: t('results.good') };
        return { emoji: '💪', text: t('results.keepPracticing') };
    };

    const message = getMessage();

    return (
        <Layout>
            <div className="results">
                {/* Header */}
                <div className="results__header animate-fade-in-down">
                    <span className="results__emoji">{message.emoji}</span>
                    <h1 className="results__title">{t('results.title')}</h1>
                    <p className="results__message">{message.text}</p>
                    {isNewHighScore && (
                        <div className="results__new-record">
                            <span>🎊</span>
                            <span>{t('results.newHighScore')}</span>
                        </div>
                    )}
                </div>

                {/* Score Card */}
                <Card className="results__score-card animate-scale-in">
                    <CardBody>
                        <div className="results__score-display">
                            <span className="results__score-label">{t('results.yourScore')}</span>
                            <span className="results__score-value">{animatedScore}</span>
                        </div>
                    </CardBody>
                </Card>

                {/* Stats Grid */}
                <div className="results__stats">
                    <Card className="results__stat-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <CardBody>
                            <span className="results__stat-icon">✓</span>
                            <span className="results__stat-value">{results.correctAnswers}</span>
                            <span className="results__stat-label">{t('results.correct')}</span>
                        </CardBody>
                    </Card>

                    <Card className="results__stat-card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        <CardBody>
                            <span className="results__stat-icon">✗</span>
                            <span className="results__stat-value">{results.wrongAnswers}</span>
                            <span className="results__stat-label">{t('results.wrong')}</span>
                        </CardBody>
                    </Card>

                    <Card className="results__stat-card animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                        <CardBody>
                            <span className="results__stat-icon">🎯</span>
                            <span className="results__stat-value">{results.accuracy}%</span>
                            <span className="results__stat-label">{t('results.accuracy')}</span>
                        </CardBody>
                    </Card>

                    <Card className="results__stat-card animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                        <CardBody>
                            <span className="results__stat-icon">🔥</span>
                            <span className="results__stat-value">{results.bestStreak}</span>
                            <span className="results__stat-label">{t('results.bestStreak')}</span>
                        </CardBody>
                    </Card>
                </div>

                {/* High Scores */}
                {highScores.length > 0 && (
                    <div className="results__high-scores animate-fade-in-up" style={{ animationDelay: '450ms' }}>
                        <h3 className="results__section-title">{t('results.highScores')}</h3>
                        <div className="results__scores-list">
                            {highScores.slice(0, 5).map((score, index) => (
                                <div key={score.id} className="results__score-item">
                                    <span className="results__score-rank">
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                    </span>
                                    <span className="results__score-points">{score.score} pts</span>
                                    <span className="results__score-accuracy">{score.accuracy}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Overall Stats */}
                {stats && stats.totalGames > 0 && (
                    <div className="results__overall-stats animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                        <div className="results__stat-row">
                            <span>{t('results.totalGames')}</span>
                            <span>{stats.totalGames}</span>
                        </div>
                        <div className="results__stat-row">
                            <span>{t('results.totalScore')}</span>
                            <span>{stats.totalScore}</span>
                        </div>
                        <div className="results__stat-row">
                            <span>{t('results.allTimeBestStreak')}</span>
                            <span>🔥 {stats.bestStreak}</span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="results__actions animate-fade-in-up" style={{ animationDelay: '550ms' }}>
                    <Button
                        size="large"
                        onClick={() => navigate(`/quiz/${results.category}/${results.difficulty}`)}
                        icon="🔄"
                    >
                        {t('results.playAgain')}
                    </Button>

                    <Button
                        variant="secondary"
                        size="large"
                        onClick={() => navigate('/categories')}
                        icon="📋"
                    >
                        {t('results.newCategory')}
                    </Button>
                </div>

                {/* Home Link */}
                <div className="results__home">
                    <Button variant="ghost" onClick={() => navigate('/')}>
                        {t('common.home')}
                    </Button>
                </div>
            </div>
        </Layout>
    );
}

export default Results;
