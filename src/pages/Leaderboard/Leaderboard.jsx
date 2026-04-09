import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import useLeaderboard from '../../hooks/useLeaderboard';
import { Card, CardBody } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Layout from '../../components/layout/Layout';
import './Leaderboard.css';

export function Leaderboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { scores, getTopScores } = useLeaderboard();

    const topScores = getTopScores(10);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const getCategoryEmoji = (category) => {
        const emojis = {
            player: '⚽',
            team: '🏟️',
            match: '📊',
            mixed: '🎯'
        };
        return emojis[category] || '🎮';
    };

    const getDifficultyColor = (difficulty) => {
        const colors = {
            easy: '#10b981',
            medium: '#f59e0b',
            hard: '#ef4444'
        };
        return colors[difficulty] || '#6366f1';
    };

    const getRankEmoji = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    return (
        <Layout>
            <div className="leaderboard">
                <button className="leaderboard__back" onClick={() => navigate('/')}>
                    <span>←</span>
                    <span>{t('common.back')}</span>
                </button>

                <div className="leaderboard__header animate-fade-in">
                    <span className="leaderboard__icon">🏆</span>
                    <h1 className="leaderboard__title">{t('leaderboard.title')}</h1>
                    <p className="leaderboard__subtitle">{t('leaderboard.subtitle')}</p>
                </div>

                {topScores.length === 0 ? (
                    <Card className="leaderboard__empty animate-fade-in-up">
                        <CardBody>
                            <span className="leaderboard__empty-icon">📭</span>
                            <p className="leaderboard__empty-text">{t('leaderboard.noData')}</p>
                            <Button onClick={() => navigate('/categories')} icon="🎮">
                                {t('home.startQuiz')}
                            </Button>
                        </CardBody>
                    </Card>
                ) : (
                    <div className="leaderboard__list">
                        {topScores.map((score, index) => (
                            <Card
                                key={score.id}
                                className={`leaderboard__item animate-slide-in-left ${index < 3 ? 'leaderboard__item--top' : ''}`}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <CardBody>
                                    <div className="leaderboard__rank">
                                        <span className="leaderboard__rank-badge">
                                            {getRankEmoji(index + 1)}
                                        </span>
                                    </div>

                                    <div className="leaderboard__info">
                                        <span className="leaderboard__player-name">
                                            {score.playerName}
                                        </span>
                                        <div className="leaderboard__meta">
                                            <span className="leaderboard__category">
                                                {getCategoryEmoji(score.category)}
                                            </span>
                                            <span
                                                className="leaderboard__difficulty"
                                                style={{ '--difficulty-color': getDifficultyColor(score.difficulty) }}
                                            >
                                                {t(`difficulty.${score.difficulty}.title`)}
                                            </span>
                                            <span className="leaderboard__date">
                                                {formatDate(score.date)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="leaderboard__score">
                                        <span className="leaderboard__score-value">{score.score}</span>
                                        <span className="leaderboard__accuracy">{score.accuracy}%</span>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                )}

                <div className="leaderboard__cta animate-fade-in-up">
                    <Button size="large" onClick={() => navigate('/categories')} icon="🎮">
                        {t('home.startQuiz')}
                    </Button>
                </div>
            </div>
        </Layout>
    );
}

export default Leaderboard;
