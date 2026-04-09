import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import YouTube from 'react-youtube';
import { useTranslation } from 'react-i18next';
import { videoQuestions } from '../../data/videoQuestions';
import { saveScore } from '../../services/scoreStorage';
import Button from '../../components/common/Button';
import { Card, CardBody } from '../../components/common/Card';
import Layout from '../../components/layout/Layout';
import '../Quiz/Quiz.css'; // Reuse Quiz styles
import './VideoQuiz.css';   // Specific overrides

export function VideoQuiz() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const playerRef = useRef(null);
    const playerName = localStorage.getItem('quiz_username');

    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [isQuestionActive, setIsQuestionActive] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(15);
    const [streak, setStreak] = useState(0);
    const [nextQuestionCountdown, setNextQuestionCountdown] = useState(null);

    // Shuffle questions on mount
    useEffect(() => {
        const shuffled = [...videoQuestions].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
    }, []);

    const currentQuestion = questions[currentIndex];

    // YouTube Player Options
    const opts = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            start: currentQuestion?.startTime,
        },
    };

    const onPlayerReady = (event) => {
        playerRef.current = event.target;
        setLoading(false);
        if (currentQuestion) {
            event.target.seekTo(currentQuestion.startTime);
            event.target.playVideo();
        }
    };

    // Timer Logic
    useEffect(() => {
        let timer;
        if (isQuestionActive && !isAnswered && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isQuestionActive && !isAnswered) {
            handleAnswer(null); // Time up
        }
        return () => clearInterval(timer);
    }, [isQuestionActive, isAnswered, timeLeft]);

    // Video Time Check Loop
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current && !isQuestionActive && !isAnswered && !loading) {
                const currentTime = playerRef.current.getCurrentTime();

                // Pause at critical moment
                if (currentTime >= currentQuestion.pauseTime && currentTime < currentQuestion.pauseTime + 1) {
                    playerRef.current.pauseVideo();
                    setIsQuestionActive(true);
                    setTimeLeft(15);
                    // Scroll to question
                    setTimeout(() => {
                        document.querySelector('.quiz__body')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }
            }
        }, 200);

        return () => clearInterval(interval);
    }, [isQuestionActive, isAnswered, loading, currentQuestion]);

    // Countdown Effect for Next Question
    useEffect(() => {
        if (nextQuestionCountdown === null) return;

        if (nextQuestionCountdown > 0) {
            const timer = setTimeout(() => {
                setNextQuestionCountdown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            goToNextQuestion();
        }
    }, [nextQuestionCountdown]);

    const handleAnswer = (option) => {
        if (isAnswered) return;

        setSelectedAnswer(option);
        setIsAnswered(true);

        const isCorrect = option === currentQuestion.correctAnswer;
        if (isCorrect) {
            setScore((s) => s + 10 + (timeLeft * 0.5));
            setStreak((s) => s + 1);
        } else {
            setStreak(0);
        }

        // Wait 1.5 seconds showing result (feedback), then resume video
        setTimeout(() => {
            if (playerRef.current) playerRef.current.playVideo();

            // Scroll back to video to watch outcome
            document.querySelector('.video-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Start Countdown for next question (10 seconds)
            setNextQuestionCountdown(10);
        }, 1500);
    };

    const goToNextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            setIsAnswered(false);
            setSelectedAnswer(null);
            setIsQuestionActive(false);
            setLoading(true);
            setTimeLeft(15);
            setNextQuestionCountdown(null);
            // Scroll to top for new video
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            finishQuiz();
        }
    };

    const finishQuiz = () => {
        saveScore(score, 'video', 'medium', 0, score / 10, questions.length);
        navigate('/results', { state: { score, totalQuestions: questions.length, correctAnswers: score / 10, isVideoQuiz: true } });
    };

    // Timer UI Props
    const maxTime = 15;
    const timerPercent = (timeLeft / maxTime) * 100;
    const timerClass = timeLeft <= 5 ? 'quiz__timer quiz__timer--warning' : 'quiz__timer';

    const getOptionClass = (option) => {
        if (!isAnswered) return 'quiz__option';
        if (option === currentQuestion.correctAnswer) return 'quiz__option quiz__option--correct';
        if (option === selectedAnswer) return 'quiz__option quiz__option--wrong';
        return 'quiz__option quiz__option--disabled';
    };

    if (!currentQuestion) return <div className="video-quiz__loading">{t('common.loading')}</div>;

    return (
        <Layout>
            <div className="quiz video-quiz-wrapper">
                {/* Reused Header */}
                <header className="quiz__header">
                    <div className="quiz__header-left">
                        <div className={timerClass}>
                            <svg className="quiz__timer-circle" viewBox="0 0 36 36">
                                <path className="quiz__timer-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className="quiz__timer-progress" strokeDasharray={`${timerPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <span className="quiz__timer-value">{timeLeft}</span>
                        </div>
                        <div className="quiz__info">
                            {playerName && <span className="quiz__player-name">{t('quiz.contestant')}: {playerName}</span>}
                            <span className="quiz__question-count">{currentIndex + 1} / {questions.length}</span>
                            <span className="quiz__score">{Math.round(score)} pts</span>
                        </div>
                    </div>
                    <div className="quiz__header-right">
                        {streak > 0 && <div className="quiz__streak animate-bounce"><span>🔥</span><span>{streak}x</span></div>}

                        {/* Countdown Timer (Top Right) */}
                        {nextQuestionCountdown > 0 && (
                            <div className="video-quiz__countdown-header animate-pulse">
                                <span>⏳ {nextQuestionCountdown}s</span>
                            </div>
                        )}
                    </div>
                </header>

                <div className="video-quiz__content">
                    {/* Video Container - Always Visible */}
                    <div className="video-container">
                        <YouTube
                            key={currentQuestion.videoId + currentIndex} // Force remount to reset player state
                            videoId={currentQuestion.videoId}
                            opts={opts}
                            onReady={onPlayerReady}
                            className="video-player"
                        />
                        <div className="video-brand">FUTBOL QUIZ TV</div>
                    </div>

                    {/* Question Content - Visible when Paused or Answered */}
                    {(isQuestionActive || isAnswered) && (
                        <div className="quiz__body animate-fade-in-up">
                            <Card className="quiz__question-card">
                                <CardBody className="quiz__question-body">
                                    <h2 className="quiz__question-text">{currentQuestion.question}</h2>

                                    {/* Inline Timer for Mobile/Scroll Visibility */}
                                    <div className={`quiz__inline-timer ${timeLeft <= 5 ? 'quiz__inline-timer--warning' : ''}`}>
                                        <svg viewBox="0 0 36 36" className="quiz__inline-timer-svg">
                                            <path className="quiz__timer-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                            <path className="quiz__timer-progress" strokeDasharray={`${timerPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        </svg>
                                        <span className="quiz__inline-timer-text">{timeLeft}</span>
                                    </div>
                                </CardBody>
                            </Card>

                            <div className="quiz__options">
                                {currentQuestion.options.map((option, idx) => (
                                    <button
                                        key={idx}
                                        className={getOptionClass(option)}
                                        onClick={() => handleAnswer(option)}
                                        disabled={isAnswered}
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <span className="quiz__option-letter">{String.fromCharCode(65 + idx)}</span>
                                        <span className="quiz__option-text">{option}</span>
                                        {isAnswered && option === currentQuestion.correctAnswer && <span className="quiz__option-icon">✓</span>}
                                        {isAnswered && option === selectedAnswer && option !== currentQuestion.correctAnswer && <span className="quiz__option-icon">✗</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Feedback Check - With Countdown */}
                    {isAnswered && (
                        <div className="quiz__feedback animate-fade-in-up">
                            {selectedAnswer === currentQuestion.correctAnswer ? (
                                <div className="quiz__feedback-message quiz__feedback-message--correct">
                                    <span>🎉</span><span>{t('quiz.correct')}</span>
                                </div>
                            ) : (
                                <div className="quiz__feedback-message quiz__feedback-message--wrong">
                                    <span>{selectedAnswer ? t('quiz.wrong') : t('quiz.timeUp')}</span>
                                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>🎥 {t('video.watchOutcome', 'İzle ve gör!')}</p>
                                </div>
                            )}


                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

export default VideoQuiz;
