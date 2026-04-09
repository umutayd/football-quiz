import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody } from '../../components/common/Card';
import Layout from '../../components/layout/Layout';
import './Categories.css';

const CATEGORIES = [
    { id: 'player', icon: '⚽', color: '#6366f1' },
    { id: 'team', icon: '🏟️', color: '#8b5cf6' },
    { id: 'match', icon: '📊', color: '#06b6d4' },
    { id: 'mixed', icon: '🎯', color: '#f59e0b' },
    { id: 'whoami', icon: '🕵️', color: '#22c55e' },
    { id: 'video', icon: '🎥', color: '#ef4444' },
];

const DIFFICULTIES = [
    { id: 'easy', icon: '🟢', color: '#10b981', time: 20 },
    { id: 'medium', icon: '🟡', color: '#f59e0b', time: 15 },
    { id: 'hard', icon: '🔴', color: '#ef4444', time: 10 },
];

export function Categories() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState(null);

    const handleCategorySelect = (categoryId) => {
        if (categoryId === 'video') {
            navigate('/video-quiz');
            return;
        }
        if (categoryId === 'whoami') {
            navigate('/ben-kimim');
            return;
        }
        setSelectedCategory(categoryId);
    };

    // Auto-start quiz when difficulty is selected - no Start button needed
    const handleDifficultySelect = (difficultyId) => {
        if (selectedCategory) {
            navigate(`/quiz/${selectedCategory}/${difficultyId}`);
        }
    };

    const handleBack = () => {
        if (selectedCategory) {
            setSelectedCategory(null);
        } else {
            navigate('/');
        }
    };

    return (
        <Layout>
            <div className="categories">
                <button className="categories__back" onClick={handleBack}>
                    <span>←</span>
                    <span>{t('common.back')}</span>
                </button>

                {!selectedCategory ? (
                    // Category Selection
                    <section className="categories__section animate-fade-in">
                        <div className="categories__header">
                            <h1 className="categories__title">{t('categories.title')}</h1>
                            <p className="categories__subtitle">{t('categories.subtitle')}</p>
                        </div>

                        <div className="categories__grid">
                            {CATEGORIES.map((category, index) => (
                                <Card
                                    key={category.id}
                                    hoverable
                                    onClick={() => handleCategorySelect(category.id)}
                                    className="categories__card animate-fade-in-up"
                                    style={{
                                        animationDelay: `${index * 100}ms`,
                                        '--card-accent': category.color
                                    }}
                                >
                                    <CardBody>
                                        <span className="categories__card-icon">{category.icon}</span>
                                        <h3 className="categories__card-title">
                                            {t(`categories.${category.id}.title`)}
                                        </h3>
                                        <p className="categories__card-desc">
                                            {t(`categories.${category.id}.description`)}
                                        </p>
                                    </CardBody>
                                </Card>
                            ))}
                        </div>
                    </section>
                ) : (
                    // Difficulty Selection - clicking starts the quiz immediately
                    <section className="categories__section animate-fade-in">
                        <div className="categories__header">
                            <div className="categories__selected-category">
                                <span className="categories__selected-icon">
                                    {CATEGORIES.find(c => c.id === selectedCategory)?.icon}
                                </span>
                                <span>{t(`categories.${selectedCategory}.title`)}</span>
                            </div>
                            <h1 className="categories__title">{t('difficulty.title')}</h1>
                            <p className="categories__subtitle">{t('difficulty.clickToStart')}</p>
                        </div>

                        <div className="categories__difficulties">
                            {DIFFICULTIES.map((difficulty, index) => (
                                <Card
                                    key={difficulty.id}
                                    hoverable
                                    onClick={() => handleDifficultySelect(difficulty.id)}
                                    className="categories__difficulty-card animate-slide-in-left"
                                    style={{
                                        animationDelay: `${index * 100}ms`,
                                        '--card-accent': difficulty.color
                                    }}
                                >
                                    <CardBody>
                                        <div className="categories__difficulty-header">
                                            <span className="categories__difficulty-icon">{difficulty.icon}</span>
                                            <h3 className="categories__difficulty-title">
                                                {t(`difficulty.${difficulty.id}.title`)}
                                            </h3>
                                        </div>
                                        <p className="categories__difficulty-desc">
                                            {t(`difficulty.${difficulty.id}.description`)}
                                        </p>
                                        <div className="categories__difficulty-meta">
                                            <span className="categories__difficulty-tag">
                                                ⏱️ {difficulty.time}s
                                            </span>
                                            <span className="categories__difficulty-tag">
                                                ⭐ {t(`difficulty.${difficulty.id}.multiplier`)}
                                            </span>
                                        </div>
                                        <div className="categories__start-hint">
                                            <span>🚀</span>
                                            <span>{t('difficulty.tapToStart')}</span>
                                        </div>
                                    </CardBody>
                                </Card>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </Layout>
    );
}

export default Categories;
