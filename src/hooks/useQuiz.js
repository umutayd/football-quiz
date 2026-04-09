import { useState, useCallback, useEffect, useRef } from 'react';
import { generateQuestions, shuffleOptions } from '../services/questionGenerator';
import { saveScore, updateBestStreak } from '../services/scoreStorage';

const DIFFICULTY_CONFIG = {
    easy: { time: 20, multiplier: 1 },
    medium: { time: 15, multiplier: 1.5 },
    hard: { time: 10, multiplier: 2 }
};

export function useQuiz() {
    const [category, setCategory] = useState(null);
    const [difficulty, setDifficulty] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [isFinished, setIsFinished] = useState(false);
    const [isAnswered, setIsAnswered] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Timer ref
    const timerRef = useRef(null);

    // Get current question
    const currentQuestion = questions[currentIndex] || null;
    const totalQuestions = questions.length;
    const progress = totalQuestions > 0 ? ((currentIndex) / totalQuestions) * 100 : 0;

    // Get difficulty config
    const config = difficulty ? DIFFICULTY_CONFIG[difficulty] : null;

    // Clear timer
    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // Handle time up
    const handleTimeUp = useCallback(() => {
        clearTimer();
        setIsAnswered(true);
        setStreak(0);
    }, [clearTimer]);

    // Start timer
    const startTimer = useCallback((time) => {
        clearTimer();
        setTimeLeft(time);

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [clearTimer, handleTimeUp]);

    // Initialize quiz with category and difficulty
    const initQuiz = useCallback(async (cat, diff) => {
        clearTimer();
        setIsLoading(true);
        setError(null);

        setCategory(cat);
        setDifficulty(diff);
        setCurrentIndex(0);
        setScore(0);
        setStreak(0);
        setBestStreak(0);
        setAnswers([]);
        setIsFinished(false);
        setIsAnswered(false);
        setSelectedAnswer(null);

        try {
            // Generate questions from API
            const quizQuestions = await generateQuestions(cat, diff, 10);

            if (quizQuestions.length === 0) {
                throw new Error('No questions could be generated');
            }

            const shuffledQuestions = quizQuestions.map(q => shuffleOptions(q));
            setQuestions(shuffledQuestions);
            setIsLoading(false);

            // Start timer after questions are loaded
            const initialTime = DIFFICULTY_CONFIG[diff].time;
            setTimeout(() => startTimer(initialTime), 100);
        } catch (err) {
            console.error('Error initializing quiz:', err);
            setError(err.message);
            setIsLoading(false);
        }
    }, [clearTimer, startTimer]);

    // Handle answer selection
    const selectAnswer = useCallback((answer) => {
        if (isAnswered || !currentQuestion) return;

        clearTimer();
        setSelectedAnswer(answer);
        setIsAnswered(true);

        const isCorrect = answer === currentQuestion.correctAnswer;

        // Update answers
        setAnswers(prev => [...prev, {
            question: currentQuestion,
            selectedAnswer: answer,
            isCorrect,
            timeRemaining: timeLeft
        }]);

        if (isCorrect) {
            const basePoints = currentQuestion.points || 100;
            const multiplier = config?.multiplier || 1;
            const streakBonus = 1 + (streak * 0.1);
            const timeBonus = 1 + (timeLeft / (config?.time || 20)) * 0.5;
            const points = Math.round(basePoints * multiplier * streakBonus * timeBonus);

            setScore(prev => prev + points);
            setStreak(prev => {
                const newStreak = prev + 1;
                setBestStreak(current => Math.max(current, newStreak));
                return newStreak;
            });
        } else {
            setStreak(0);
        }
    }, [isAnswered, currentQuestion, timeLeft, streak, config, clearTimer]);

    // Move to next question
    const nextQuestion = useCallback(() => {
        if (currentIndex >= totalQuestions - 1) {
            clearTimer();
            setIsFinished(true);

            // Save score to storage
            const finalAnswers = [...answers];
            if (!answers.find(a => a.question.id === currentQuestion?.id)) {
                finalAnswers.push({
                    question: currentQuestion,
                    selectedAnswer,
                    isCorrect: selectedAnswer === currentQuestion?.correctAnswer,
                    timeRemaining: timeLeft
                });
            }

            const correctAnswers = finalAnswers.filter(a => a.isCorrect).length;
            const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

            saveScore(score, category, difficulty, accuracy, correctAnswers, totalQuestions);
            updateBestStreak(bestStreak);

            return;
        }

        setCurrentIndex(prev => prev + 1);
        setIsAnswered(false);
        setSelectedAnswer(null);
        startTimer(config?.time || 20);
    }, [currentIndex, totalQuestions, config, clearTimer, startTimer, answers, currentQuestion, selectedAnswer, timeLeft, score, category, difficulty, bestStreak]);

    // Cleanup on unmount
    useEffect(() => {
        return () => clearTimer();
    }, [clearTimer]);

    // Record time-up answer
    useEffect(() => {
        if (timeLeft === 0 && isAnswered && currentQuestion && !answers.find(a => a.question.id === currentQuestion.id)) {
            setAnswers(prev => [...prev, {
                question: currentQuestion,
                selectedAnswer: null,
                isCorrect: false,
                timeRemaining: 0
            }]);
        }
    }, [timeLeft, isAnswered, currentQuestion, answers]);

    // Calculate results
    const results = {
        score,
        totalQuestions,
        correctAnswers: answers.filter(a => a.isCorrect).length,
        wrongAnswers: answers.filter(a => !a.isCorrect).length,
        accuracy: totalQuestions > 0
            ? Math.round((answers.filter(a => a.isCorrect).length / totalQuestions) * 100)
            : 0,
        bestStreak,
        answers,
        category,
        difficulty
    };

    // Reset quiz
    const resetQuiz = useCallback(() => {
        clearTimer();
        setCategory(null);
        setDifficulty(null);
        setQuestions([]);
        setCurrentIndex(0);
        setScore(0);
        setStreak(0);
        setBestStreak(0);
        setAnswers([]);
        setIsFinished(false);
        setIsAnswered(false);
        setSelectedAnswer(null);
        setTimeLeft(0);
        setIsLoading(false);
        setError(null);
    }, [clearTimer]);

    return {
        category,
        difficulty,
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
        resetQuiz,
        setCategory,
        setDifficulty
    };
}

export default useQuiz;
