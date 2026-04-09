import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import useQuiz from '../../hooks/useQuiz';
import ProgressBar from '../../components/common/ProgressBar';
import { Card, CardBody } from '../../components/common/Card';
import Button from '../../components/common/Button';
import './Quiz.css';

export function Quiz() {
    const { t, i18n } = useTranslation();
    const { category, difficulty } = useParams();
    const navigate = useNavigate();
    const playerName = localStorage.getItem('quiz_username');

    const {
        currentQuestion,
        currentIndex,
        totalQuestions,
        progress,
        score,
        streak,
        timeLeft,
        isAnswered,
        selectedAnswer,
        isFinished,
        isLoading,
        error,
        results,
        config,
        initQuiz,
        selectAnswer,
        nextQuestion,
    } = useQuiz();

    // Initialize quiz on mount
    useEffect(() => {
        if (category && difficulty) {
            initQuiz(category, difficulty);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category, difficulty]);

    // Navigate to results when finished
    useEffect(() => {
        if (isFinished) {
            sessionStorage.setItem('quizResults', JSON.stringify(results));
            navigate('/results');
        }
    }, [isFinished, results, navigate]);

    // Loading state
    if (isLoading) {
        return (
            <div className="quiz quiz--loading">
                <div className="quiz__loader">
                    <span className="quiz__loader-icon">⚽</span>
                    <p>{t('quiz.loadingQuestions')}</p>
                    <div className="quiz__loader-bar">
                        <div className="quiz__loader-progress"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="quiz quiz--error">
                <div className="quiz__error">
                    <span className="quiz__error-icon">⚠️</span>
                    <h2>{t('quiz.errorTitle')}</h2>
                    <p>{t('quiz.errorMessage')}</p>
                    <div className="quiz__error-actions">
                        <Button onClick={() => initQuiz(category, difficulty)}>
                            {t('common.tryAgain')}
                        </Button>
                        <Button variant="secondary" onClick={() => navigate('/categories')}>
                            {t('common.back')}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // No questions loaded yet
    if (!currentQuestion) {
        return (
            <div className="quiz quiz--loading">
                <div className="quiz__loader">
                    <span className="quiz__loader-icon">⚽</span>
                    <p>{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    const getOptionClass = (option) => {
        if (!isAnswered) return 'quiz__option';

        const isCorrect = option === currentQuestion.correctAnswer;
        const isSelected = option === selectedAnswer;

        if (isCorrect) return 'quiz__option quiz__option--correct';
        if (isSelected && !isCorrect) return 'quiz__option quiz__option--wrong';
        return 'quiz__option quiz__option--disabled';
    };

    // Timer progress percentage
    const maxTime = config?.time || 20;
    const timerPercent = (timeLeft / maxTime) * 100;
    const timerClass = timeLeft <= 5 ? 'quiz__timer quiz__timer--warning' : 'quiz__timer';

    return (
        <div className="quiz">
            {/* Header */}
            <header className="quiz__header">
                <div className="quiz__header-left">
                    <div className={timerClass}>
                        <svg className="quiz__timer-circle" viewBox="0 0 36 36">
                            <path
                                className="quiz__timer-bg"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                                className="quiz__timer-progress"
                                strokeDasharray={`${timerPercent}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                        </svg>
                        <span className="quiz__timer-value">{timeLeft}</span>
                    </div>

                    <div className="quiz__info">
                        {playerName && (
                            <span className="quiz__player-name">
                                {t('quiz.contestant')}: {playerName}
                            </span>
                        )}
                        <span className="quiz__question-count">
                            {currentIndex + 1} / {totalQuestions}
                        </span>
                        <span className="quiz__score">
                            {score} pts
                        </span>
                    </div>
                </div>

                <div className="quiz__header-right">
                    {streak > 0 && (
                        <div className="quiz__streak animate-bounce">
                            <span>🔥</span>
                            <span>{streak}x</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Progress Bar */}
            <ProgressBar
                value={progress}
                max={100}
                variant="primary"
                size="small"
                className="quiz__progress"
            />

            {/* Question Card */}
            <Card className="quiz__question-card animate-scale-in" key={currentQuestion.id}>
                <CardBody>
                    {currentQuestion.subjectImage && (
                        <div className="quiz__subject">
                            <img
                                src={currentQuestion.subjectImage}
                                alt={currentQuestion.subject}
                                className="quiz__subject-image"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        </div>
                    )}

                    <h2 className="quiz__question-text">
                        {currentQuestion.question[i18n.language] || currentQuestion.question.en || currentQuestion.question}
                    </h2>

                    {currentQuestion.subject && (
                        <p className="quiz__subject-name">{currentQuestion.subject}</p>
                    )}
                </CardBody>
            </Card>

            {/* Options */}
            <div className="quiz__options">
                {currentQuestion.options.map((option, index) => (
                    <button
                        key={`${currentQuestion.id}-${index}`}
                        className={getOptionClass(option)}
                        onClick={() => selectAnswer(option)}
                        disabled={isAnswered}
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <span className="quiz__option-letter">
                            {String.fromCharCode(65 + index)}
                        </span>
                        <span className="quiz__option-text">{option}</span>
                        {isAnswered && option === currentQuestion.correctAnswer && (
                            <span className="quiz__option-icon">✓</span>
                        )}
                        {isAnswered && option === selectedAnswer && option !== currentQuestion.correctAnswer && (
                            <span className="quiz__option-icon">✗</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Feedback message */}
            {isAnswered && (
                <div className="quiz__feedback animate-fade-in-up">
                    {selectedAnswer === currentQuestion.correctAnswer ? (
                        <div className="quiz__feedback-message quiz__feedback-message--correct">
                            <span>🎉</span>
                            <span>{t('quiz.correct')}</span>
                        </div>
                    ) : (
                        <div className="quiz__feedback-message quiz__feedback-message--wrong">
                            <span>{selectedAnswer ? t('quiz.wrong') : t('quiz.timeUp')}</span>
                            {currentQuestion.correctAnswer && (
                                <span className="quiz__correct-answer">
                                    {t('quiz.correctWas')}: {currentQuestion.correctAnswer}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
            {/* Actions Bar */}
            {isAnswered && (
                <div className="quiz__actions animate-fade-in-up">
                    <button
                        className="quiz__next-btn quiz__next-btn--full"
                        onClick={nextQuestion}
                    >
                        <span>
                            {currentIndex < totalQuestions - 1 ? t('quiz.next') : t('common.finish')}
                        </span>
                        <span className="quiz__next-icon">→</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default Quiz;
