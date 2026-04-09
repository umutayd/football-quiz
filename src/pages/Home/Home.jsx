import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import { Card, CardBody } from '../../components/common/Card';
import Layout from '../../components/layout/Layout';
import './Home.css';

export function Home() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [playerName, setPlayerName] = useState('');

    useEffect(() => {
        const savedName = localStorage.getItem('quiz_username');
        if (savedName) setPlayerName(savedName);
    }, []);

    const handleStart = () => {
        if (!playerName.trim()) {
            document.querySelector('.home__name-input')?.focus();
            return;
        }
        localStorage.setItem('quiz_username', playerName.trim());
        navigate('/categories');
    };

    const features = [
        { icon: '📋', text: t('home.features.categories') },
        { icon: '🎯', text: t('home.features.difficulty') },
        { icon: '⏱️', text: t('home.features.timer') },
        { icon: '🏆', text: t('home.features.leaderboard') },
    ];

    return (
        <Layout>
            <div className="home">
                {/* Hero Section */}
                <section className="home__hero">
                    <div className="home__hero-content">
                        <div className="home__football-wrapper">
                            <span className="home__football">⚽</span>
                            <div className="home__football-glow" />
                        </div>

                        <h1 className="home__title">
                            <span className="text-gradient">{t('home.title')}</span>
                        </h1>

                        <p className="home__subtitle">{t('home.subtitle')}</p>

                        <div className="home__name-input-wrapper">
                            <input
                                type="text"
                                className="home__name-input"
                                placeholder={t('home.namePlaceholder')}
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                                maxLength={20}
                            />
                        </div>

                        <div className="home__actions">
                            <Button
                                size="large"
                                onClick={handleStart}
                                icon="🎮"
                                disabled={!playerName.trim()}
                            >
                                {t('home.startQuiz')}
                            </Button>

                            <Button
                                variant="secondary"
                                size="large"
                                onClick={() => navigate('/leaderboard')}
                                icon="🏆"
                            >
                                {t('home.leaderboard')}
                            </Button>
                        </div>
                    </div>

                    {/* Floating Elements */}
                    <div className="home__floating-elements">
                        <span className="home__floating-emoji" style={{ '--delay': '0s', '--x': '10%', '--y': '20%' }}>🏟️</span>
                        <span className="home__floating-emoji" style={{ '--delay': '1s', '--x': '85%', '--y': '15%' }}>🥅</span>
                        <span className="home__floating-emoji" style={{ '--delay': '2s', '--x': '15%', '--y': '70%' }}>🎽</span>
                        <span className="home__floating-emoji" style={{ '--delay': '0.5s', '--x': '80%', '--y': '65%' }}>👟</span>
                        <span className="home__floating-emoji" style={{ '--delay': '1.5s', '--x': '50%', '--y': '85%' }}>🏅</span>
                    </div>
                </section>

                {/* Features Section */}
                <section className="home__features">
                    <div className="home__features-grid">
                        {features.map((feature, index) => (
                            <Card
                                key={index}
                                hoverable
                                className="home__feature-card animate-fade-in-up"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <CardBody>
                                    <span className="home__feature-icon">{feature.icon}</span>
                                    <span className="home__feature-text">{feature.text}</span>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* How to Play */}
                <section className="home__how-to-play">
                    <Card className="home__instructions-card">
                        <CardBody>
                            <h3 className="home__instructions-title">
                                <span>💡</span>
                                {t('home.howToPlay')}
                            </h3>
                            <p className="home__instructions-text">
                                {t('home.howToPlayDesc')}
                            </p>
                        </CardBody>
                    </Card>
                </section>
            </div>
        </Layout>
    );
}

export default Home;
