import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { Card, CardBody } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Layout from '../../components/layout/Layout';
import { getWhoAmIPlayers } from '../../services/whoAmIApi';
import './WhoAmI.css';

const MAX_ATTEMPTS = 8;
const STORAGE_PROGRESS_KEY = 'football_quiz_whoami_progress_v1';
const STORAGE_STATS_KEY = 'football_quiz_whoami_stats_v1';
const DAILY_EPOCH = new Date(2026, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;

const FEEDBACK_COLUMNS = [
    { key: 'nationality', labelKey: 'nationality' },
    { key: 'league', labelKey: 'league' },
    { key: 'team', labelKey: 'team' },
    { key: 'position', labelKey: 'position' },
    { key: 'age', labelKey: 'age' },
    { key: 'shirtNumber', labelKey: 'shirtNumber' }
];

const DEFAULT_PROGRESS = {
    guessIds: [],
    showPhoto: true,
    finished: false,
    won: false,
    statsRecorded: false
};

const DEFAULT_STATS = {
    totalPlayed: 0,
    totalWins: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedDate: null
};

function pad2(num) {
    return String(num).padStart(2, '0');
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return startOfDay(next);
}

function toDateKey(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function fromDateKey(dateKey) {
    if (!dateKey) return startOfDay(new Date());
    const [year, month, day] = dateKey.split('-').map(Number);
    if (!year || !month || !day) return startOfDay(new Date());
    return startOfDay(new Date(year, month - 1, day));
}

function normalizeText(value) {
    return (value || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('tr-TR')
        .trim();
}

function resolveGuessPlayer(input, availablePlayers) {
    const normalizedInput = normalizeText(input);
    if (!normalizedInput) return null;

    const exact = availablePlayers.find(
        (player) => normalizeText(player.name) === normalizedInput
    );
    if (exact) return exact;

    const tokenMatches = availablePlayers.filter((player) => {
        const tokens = normalizeText(player.name).split(/\s+/).filter(Boolean);
        return tokens.includes(normalizedInput);
    });
    if (tokenMatches.length === 1) return tokenMatches[0];

    const startsWithMatches = availablePlayers.filter((player) =>
        normalizeText(player.name).startsWith(normalizedInput)
    );
    if (startsWithMatches.length === 1) return startsWithMatches[0];

    const containsMatches = availablePlayers.filter((player) =>
        normalizeText(player.name).includes(normalizedInput)
    );
    if (containsMatches.length === 1) return containsMatches[0];

    return null;
}

function calculateAge(birthDate, refDate) {
    const birth = new Date(birthDate);
    const ref = new Date(refDate);

    let age = ref.getFullYear() - birth.getFullYear();
    const monthDiff = ref.getMonth() - birth.getMonth();
    const hasBirthdayPassed = monthDiff > 0 || (monthDiff === 0 && ref.getDate() >= birth.getDate());

    if (!hasBirthdayPassed) {
        age -= 1;
    }

    return age;
}

function compareNumeric(guessValue, targetValue) {
    if (guessValue === targetValue) {
        return { status: 'correct', indicator: '=' };
    }

    if (guessValue < targetValue) {
        return { status: 'higher', indicator: '↑' };
    }

    return { status: 'lower', indicator: '↓' };
}

function getDailyPlayer(date, players) {
    if (!players?.length) return null;

    const dateAtStart = startOfDay(date);
    const epochAtStart = startOfDay(DAILY_EPOCH);
    const dayOffset = Math.floor((dateAtStart.getTime() - epochAtStart.getTime()) / DAY_MS);
    const index = ((dayOffset % players.length) + players.length) % players.length;

    return players[index];
}

function safeLoad(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function getEmoji(status) {
    if (status === 'correct') return '🟩';
    if (status === 'higher' || status === 'lower') return '🟨';
    return '🟥';
}

function buildFeedback(guessPlayer, targetPlayer, refDate) {
    const guessAge = calculateAge(guessPlayer.birthDate, refDate);
    const targetAge = calculateAge(targetPlayer.birthDate, refDate);
    const ageComparison = compareNumeric(guessAge, targetAge);
    const shirtComparison = compareNumeric(guessPlayer.shirtNumber, targetPlayer.shirtNumber);

    return {
        nationality: {
            value: guessPlayer.nationality,
            status: guessPlayer.nationality === targetPlayer.nationality ? 'correct' : 'wrong'
        },
        league: {
            value: guessPlayer.league,
            status: guessPlayer.league === targetPlayer.league ? 'correct' : 'wrong'
        },
        team: {
            value: guessPlayer.team,
            status: guessPlayer.team === targetPlayer.team ? 'correct' : 'wrong'
        },
        position: {
            value: guessPlayer.position,
            status: guessPlayer.position === targetPlayer.position ? 'correct' : 'wrong'
        },
        age: {
            value: String(guessAge),
            status: ageComparison.status,
            indicator: ageComparison.indicator
        },
        shirtNumber: {
            value: `#${guessPlayer.shirtNumber}`,
            status: shirtComparison.status,
            indicator: shirtComparison.indicator
        }
    };
}

function recordTodayStats(prevStats, won, todayKey, yesterdayKey) {
    if (prevStats.lastPlayedDate === todayKey) {
        return prevStats;
    }

    const totalPlayed = prevStats.totalPlayed + 1;
    const totalWins = prevStats.totalWins + (won ? 1 : 0);

    let currentStreak = 0;
    if (won) {
        currentStreak = prevStats.lastPlayedDate === yesterdayKey
            ? prevStats.currentStreak + 1
            : 1;
    }

    return {
        totalPlayed,
        totalWins,
        currentStreak,
        bestStreak: Math.max(prevStats.bestStreak, currentStreak),
        lastPlayedDate: todayKey
    };
}

export function WhoAmI() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const today = useMemo(() => startOfDay(new Date()), []);
    const todayKey = useMemo(() => toDateKey(today), [today]);
    const yesterdayKey = useMemo(() => toDateKey(addDays(today, -1)), [today]);

    const [selectedDate, setSelectedDate] = useState(today);
    const [progressByDate, setProgressByDate] = useState(() => safeLoad(STORAGE_PROGRESS_KEY, {}));
    const [stats, setStats] = useState(() => safeLoad(STORAGE_STATS_KEY, DEFAULT_STATS));
    const [players, setPlayers] = useState([]);
    const [poolLoading, setPoolLoading] = useState(true);
    const [poolError, setPoolError] = useState('');
    const [query, setQuery] = useState('');
    const [error, setError] = useState('');
    const [copyStatus, setCopyStatus] = useState('');
    const [imageError, setImageError] = useState(false);
    const winFxDateRef = useRef('');

    const loadPlayerPool = useCallback(async (forceRefresh = false) => {
        setPoolLoading(true);
        setPoolError('');

        try {
            const playerPool = await getWhoAmIPlayers({ forceRefresh });
            setPlayers(playerPool);
        } catch (poolFetchError) {
            console.error('WhoAmI pool load error:', poolFetchError);
            setPoolError(t('whoamiGame.state.loadError'));
        } finally {
            setPoolLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadPlayerPool();
    }, [loadPlayerPool]);

    const playersById = useMemo(() => {
        const map = new Map();
        players.forEach((player) => {
            map.set(player.id, player);
        });
        return map;
    }, [players]);

    const dateKey = toDateKey(selectedDate);
    const isToday = dateKey === todayKey;
    const mysteryPlayer = getDailyPlayer(selectedDate, players);

    const dateProgress = progressByDate[dateKey] || DEFAULT_PROGRESS;
    const guessedPlayers = (dateProgress.guessIds || [])
        .map((id) => playersById.get(id))
        .filter(Boolean);

    const hasWon = !!mysteryPlayer && guessedPlayers.some((player) => player.id === mysteryPlayer.id);
    const isFinished = !!mysteryPlayer && (hasWon || guessedPlayers.length >= MAX_ATTEMPTS);
    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - guessedPlayers.length);
    const winRate = stats.totalPlayed > 0 ? Math.round((stats.totalWins / stats.totalPlayed) * 100) : 0;
    const guessProgress = Math.round((guessedPlayers.length / MAX_ATTEMPTS) * 100);

    const saveProgressForDate = useCallback((targetDateKey, updater) => {
        setProgressByDate((prev) => {
            const current = {
                ...DEFAULT_PROGRESS,
                ...(prev[targetDateKey] || {})
            };

            const nextEntry = typeof updater === 'function'
                ? updater(current)
                : { ...current, ...updater };

            const next = {
                ...prev,
                [targetDateKey]: nextEntry
            };

            localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    useEffect(() => {
        setImageError(false);
        setQuery('');
        setError('');
        setCopyStatus('');
    }, [dateKey]);

    useEffect(() => {
        if (!isToday || !isFinished || dateProgress.statsRecorded) {
            return;
        }

        setStats((prevStats) => {
            const nextStats = recordTodayStats(prevStats, hasWon, todayKey, yesterdayKey);
            localStorage.setItem(STORAGE_STATS_KEY, JSON.stringify(nextStats));
            return nextStats;
        });

        saveProgressForDate(dateKey, (current) => ({
            ...current,
            won: hasWon,
            finished: true,
            statsRecorded: true
        }));
    }, [dateKey, dateProgress.statsRecorded, hasWon, isFinished, isToday, saveProgressForDate, todayKey, yesterdayKey]);

    useEffect(() => {
        if (!isFinished || !hasWon) return;
        if (winFxDateRef.current === dateKey) return;

        winFxDateRef.current = dateKey;

        const base = {
            spread: 70,
            startVelocity: 42,
            ticks: 120,
            zIndex: 1200
        };

        confetti({
            ...base,
            particleCount: 85,
            origin: { x: 0.15, y: 0.62 }
        });
        confetti({
            ...base,
            particleCount: 85,
            origin: { x: 0.85, y: 0.62 }
        });
    }, [dateKey, hasWon, isFinished]);

    const guessedIds = useMemo(() => new Set(dateProgress.guessIds || []), [dateProgress.guessIds]);

    const availablePlayers = useMemo(() => {
        return players
            .filter((player) => !guessedIds.has(player.id))
            .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    }, [guessedIds, players]);

    const suggestions = useMemo(() => {
        const normalizedQuery = normalizeText(query);
        if (!normalizedQuery) {
            return availablePlayers.slice(0, 8);
        }

        return availablePlayers
            .filter((player) => normalizeText(player.name).includes(normalizedQuery))
            .slice(0, 8);
    }, [availablePlayers, query]);

    const guessRows = useMemo(() => {
        if (!mysteryPlayer) return [];

        return guessedPlayers.map((player, index) => ({
            attempt: index + 1,
            player,
            feedback: buildFeedback(player, mysteryPlayer, selectedDate)
        }));
    }, [guessedPlayers, mysteryPlayer, selectedDate]);

    const historyRows = useMemo(() => {
        return [...guessRows].reverse();
    }, [guessRows]);

    const resultText = useMemo(() => {
        if (!isFinished || !mysteryPlayer) return '';
        if (hasWon) {
            return t('whoamiGame.result.win', { count: guessedPlayers.length });
        }
        return t('whoamiGame.result.lose', { player: mysteryPlayer.name });
    }, [guessedPlayers.length, hasWon, isFinished, mysteryPlayer, t]);

    const shareText = useMemo(() => {
        const score = hasWon ? `${guessedPlayers.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
        const rows = guessRows
            .map((row) => FEEDBACK_COLUMNS.map((col) => getEmoji(row.feedback[col.key].status)).join(''))
            .join('\n');

        const archiveLine = isToday ? '' : `\n(${t('whoamiGame.labels.archiveGame')})`;
        return `${t('whoamiGame.title')} ${dateKey} ${score}\n${rows}${archiveLine}`;
    }, [dateKey, guessRows, guessedPlayers.length, hasWon, isToday, t]);

    const canGoNext = selectedDate.getTime() < today.getTime();

    const handleSubmit = (event) => {
        event.preventDefault();

        if (isFinished || !mysteryPlayer) return;

        const normalized = normalizeText(query);
        if (!normalized) {
            setError(t('whoamiGame.errors.emptyGuess'));
            return;
        }

        const selectedPlayer = resolveGuessPlayer(normalized, availablePlayers);

        if (!selectedPlayer) {
            setError(t('whoamiGame.errors.invalidGuess'));
            return;
        }

        saveProgressForDate(dateKey, (current) => {
            const nextGuessIds = [...current.guessIds, selectedPlayer.id];
            const won = selectedPlayer.id === mysteryPlayer.id;
            const finished = won || nextGuessIds.length >= MAX_ATTEMPTS;

            return {
                ...current,
                guessIds: nextGuessIds,
                won,
                finished
            };
        });

        setQuery('');
        setError('');
    };

    const handleSuggestionClick = (player) => {
        if (isFinished || !mysteryPlayer) return;

        saveProgressForDate(dateKey, (current) => {
            const nextGuessIds = [...current.guessIds, player.id];
            const won = player.id === mysteryPlayer.id;
            const finished = won || nextGuessIds.length >= MAX_ATTEMPTS;

            return {
                ...current,
                guessIds: nextGuessIds,
                won,
                finished
            };
        });

        setQuery('');
        setError('');
    };

    const handleRandomGuess = () => {
        if (isFinished || availablePlayers.length === 0) return;

        const randomIndex = Math.floor(Math.random() * availablePlayers.length);
        handleSuggestionClick(availablePlayers[randomIndex]);
    };

    const handlePhotoToggle = () => {
        saveProgressForDate(dateKey, (current) => ({
            ...current,
            showPhoto: !current.showPhoto
        }));
    };

    const handleDateChange = (event) => {
        const nextDate = fromDateKey(event.target.value);
        if (nextDate.getTime() > today.getTime()) {
            setSelectedDate(today);
            return;
        }
        setSelectedDate(nextDate);
    };

    const handleCopyResult = async () => {
        if (!shareText) return;

        try {
            await navigator.clipboard.writeText(shareText);
            setCopyStatus(t('whoamiGame.share.copySuccess'));
        } catch {
            setCopyStatus(t('whoamiGame.share.copyFail'));
        }
    };

    const showPhoto = dateProgress.showPhoto ?? true;
    const blurAmount = showPhoto
        ? (isFinished ? 0 : Math.max(1.5, 22 - guessedPlayers.length * 3.5))
        : 40;
    const preventContextMenu = (event) => event.preventDefault();

    if (poolLoading) {
        return (
            <Layout>
                <div className="whoami whoami--state">
                    <Card className="whoami__state-card">
                        <CardBody>
                            <h2>{t('whoamiGame.title')}</h2>
                            <p>{t('whoamiGame.state.loadingPool')}</p>
                        </CardBody>
                    </Card>
                </div>
            </Layout>
        );
    }

    if (poolError || !mysteryPlayer) {
        return (
            <Layout>
                <div className="whoami whoami--state">
                    <Card className="whoami__state-card">
                        <CardBody>
                            <h2>{t('whoamiGame.title')}</h2>
                            <p>{poolError || t('whoamiGame.state.emptyPool')}</p>
                            <div className="whoami__state-actions">
                                <Button onClick={() => loadPlayerPool(true)}>{t('common.tryAgain')}</Button>
                                <Button variant="secondary" onClick={() => navigate('/categories')}>{t('whoamiGame.buttons.categories')}</Button>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className={`whoami ${hasWon ? 'whoami--victory' : ''}`}>
                <div className="whoami__topbar">
                    <button className="whoami__back" onClick={() => navigate('/categories')}>
                        <span>←</span>
                        <span>{t('whoamiGame.buttons.categories')}</span>
                    </button>

                    <div className="whoami__date-nav">
                        <button
                            className="whoami__date-btn"
                            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                            aria-label={t('whoamiGame.buttons.previousDay')}
                        >
                            ←
                        </button>

                        <label className="whoami__date-picker">
                            <span>📅</span>
                            <input
                                type="date"
                                value={dateKey}
                                max={todayKey}
                                onChange={handleDateChange}
                            />
                        </label>

                        <button
                            className="whoami__date-btn"
                            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                            disabled={!canGoNext}
                            aria-label={t('whoamiGame.buttons.nextDay')}
                        >
                            →
                        </button>

                        <Button
                            size="small"
                            variant="secondary"
                            onClick={() => loadPlayerPool(true)}
                        >
                            {t('whoamiGame.buttons.refreshPool')}
                        </Button>
                    </div>
                </div>

                <Card className="whoami__hero animate-fade-in">
                    <CardBody>
                        <div className="whoami__hero-head">
                            <h1 className="whoami__title">{t('whoamiGame.title')}</h1>
                            <span className={`whoami__badge ${isToday ? 'whoami__badge--today' : 'whoami__badge--archive'}`}>
                                {isToday ? t('whoamiGame.labels.dailyGame') : t('whoamiGame.labels.archiveGame')}
                            </span>
                        </div>

                        <div className="whoami__hero-body">
                            <div className="whoami__hero-info">
                                <p className="whoami__subtitle">
                                    {t('whoamiGame.subtitle')}
                                </p>
                                <div className="whoami__hero-tags">
                                    {FEEDBACK_COLUMNS.map((column) => (
                                        <span key={column.key}>{t(`whoamiGame.feedback.${column.labelKey}`)}</span>
                                    ))}
                                </div>
                                <div
                                    className="whoami__hero-meter"
                                    role="progressbar"
                                    aria-valuemin={0}
                                    aria-valuemax={MAX_ATTEMPTS}
                                    aria-valuenow={guessedPlayers.length}
                                >
                                    <div
                                        className="whoami__hero-meter-fill"
                                        style={{ width: `${guessProgress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="whoami__hero-kpis">
                                <div className="whoami__hero-kpi whoami__hero-kpi--guess animate-fade-in-up">
                                    <span>{t('whoamiGame.kpi.guess')}</span>
                                    <strong>{guessedPlayers.length}/{MAX_ATTEMPTS}</strong>
                                </div>
                                <div className="whoami__hero-kpi whoami__hero-kpi--remaining animate-fade-in-up" style={{ animationDelay: '80ms' }}>
                                    <span>{t('whoamiGame.kpi.remaining')}</span>
                                    <strong>{attemptsLeft}</strong>
                                </div>
                                <div
                                    className={`whoami__hero-kpi whoami__hero-kpi--streak animate-fade-in-up ${stats.currentStreak > 0 ? 'whoami__hero-kpi--hot animate-pulse' : ''}`}
                                    style={{ animationDelay: '160ms' }}
                                >
                                    <span>{t('whoamiGame.kpi.streak')}</span>
                                    <strong>{stats.currentStreak}{stats.currentStreak > 0 ? ' 🔥' : ''}</strong>
                                </div>
                            </div>
                        </div>

                        {!isToday && (
                            <p className="whoami__archive-note">
                                {t('whoamiGame.labels.archiveInfo')}
                            </p>
                        )}
                    </CardBody>
                </Card>

                <div className="whoami__main">
                    <Card className="whoami__photo-card animate-fade-in-up">
                        <CardBody>
                            <div className="whoami__photo-header">
                                <h2>{t('whoamiGame.sections.mysteryPlayer')}</h2>
                                <Button variant="secondary" size="small" onClick={handlePhotoToggle}>
                                    {showPhoto ? t('whoamiGame.buttons.hidePhoto') : t('whoamiGame.buttons.showPhoto')}
                                </Button>
                            </div>

                            <div
                                className="whoami__photo-wrapper"
                                onContextMenu={preventContextMenu}
                            >
                                {!imageError ? (
                                    <img
                                        src={mysteryPlayer.photo}
                                        alt={t('whoamiGame.sections.mysteryPlayer')}
                                        className="whoami__photo"
                                        style={{ filter: `blur(${blurAmount}px)` }}
                                        onError={() => setImageError(true)}
                                        onContextMenu={preventContextMenu}
                                        onDragStart={preventContextMenu}
                                        draggable={false}
                                    />
                                ) : (
                                    <div className="whoami__photo-fallback" aria-label={t('whoamiGame.state.photoError')}>
                                        <span className="whoami__photo-fallback-icon">👤</span>
                                        <span className="whoami__photo-fallback-text">{t('whoamiGame.state.photoError')}</span>
                                    </div>
                                )}
                                {!showPhoto && <div className="whoami__photo-overlay">{t('whoamiGame.labels.photoHidden')}</div>}
                            </div>

                            <p className="whoami__photo-tip">
                                {t('whoamiGame.labels.photoHint')}
                            </p>
                        </CardBody>
                    </Card>

                    <div className="whoami__side-col">
                        <Card className="whoami__guess-card animate-fade-in-up">
                            <CardBody>
                                <div className="whoami__guess-head">
                                    <h2>{t('whoamiGame.sections.makeGuess')}</h2>
                                    <span>{t('whoamiGame.labels.remainingAttempts', { count: attemptsLeft })}</span>
                                </div>
                                <div className="whoami__lives" aria-hidden="true">
                                    {Array.from({ length: MAX_ATTEMPTS }).map((_, index) => (
                                        <span
                                            key={index}
                                            className={`whoami__life-dot ${index < guessedPlayers.length ? 'whoami__life-dot--used' : 'whoami__life-dot--left'}`}
                                        />
                                    ))}
                                </div>

                                <form className="whoami__form" onSubmit={handleSubmit}>
                                    <input
                                        className="whoami__input"
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder={t('whoamiGame.placeholders.playerName')}
                                        disabled={isFinished}
                                    />
                                    <div className="whoami__form-actions">
                                        <Button type="submit" disabled={isFinished}>{t('whoamiGame.buttons.guess')}</Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={handleRandomGuess}
                                            disabled={isFinished || availablePlayers.length === 0}
                                        >
                                            {t('whoamiGame.buttons.randomGuess')}
                                        </Button>
                                    </div>
                                </form>

                                {error && <p className="whoami__error">{error}</p>}

                                {!isFinished && suggestions.length > 0 && (
                                    <div className="whoami__suggestions">
                                        {suggestions.map((player, index) => (
                                            <button
                                                key={player.id}
                                                className="whoami__suggestion"
                                                onClick={() => handleSuggestionClick(player)}
                                                style={{ animationDelay: `${index * 36}ms` }}
                                            >
                                                <span>{player.name}</span>
                                                <span>{player.league}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {isFinished && (
                                    <div className={`whoami__result ${hasWon ? 'whoami__result--win animate-glow' : 'whoami__result--lose animate-shake'}`}>
                                        <p>{resultText}</p>
                                        <p className="whoami__answer-line">
                                            {t('whoamiGame.labels.playerAnswer')}:
                                            {' '}
                                            <strong>{mysteryPlayer.name}</strong>
                                            {' '}
                                            ({mysteryPlayer.team} / {mysteryPlayer.league})
                                        </p>
                                        <div className="whoami__result-actions">
                                            <Button onClick={handleCopyResult} variant="secondary">{t('whoamiGame.buttons.copyResult')}</Button>
                                        </div>
                                        {copyStatus && <p className="whoami__copy-status">{copyStatus}</p>}
                                    </div>
                                )}

                                {/* <div className="whoami__stats">
                                    <div className="whoami__stats-item">
                                        <span>{t('whoamiGame.stats.played')}</span>
                                        <strong>{stats.totalPlayed}</strong>
                                    </div>
                                    <div className="whoami__stats-item">
                                        <span>{t('whoamiGame.stats.winRate')}</span>
                                        <strong>%{winRate}</strong>
                                    </div>
                                    <div className="whoami__stats-item">
                                        <span>{t('whoamiGame.stats.bestStreak')}</span>
                                        <strong>{stats.bestStreak}</strong>
                                    </div>
                                </div> */}
                            </CardBody>
                        </Card>

                        <Card className="whoami__history-card animate-fade-in-up">
                            <CardBody>
                                <h2>{t('whoamiGame.sections.guessHistory')}</h2>

                                {historyRows.length === 0 ? (
                                    <p className="whoami__empty">{t('whoamiGame.state.noGuesses')}</p>
                                ) : (
                                    <div className="whoami__rows">
                                        {historyRows.map((row, index) => (
                                            <div
                                                key={`${row.player.id}-${row.attempt}`}
                                                className="whoami__row animate-fade-in-up"
                                                style={{ animationDelay: `${index * 50}ms` }}
                                            >
                                                <div className="whoami__row-head">
                                                    <span className="whoami__attempt">#{row.attempt}</span>
                                                    <span className="whoami__player">{row.player.name}</span>
                                                </div>

                                                <div className="whoami__feedback-grid">
                                                    {FEEDBACK_COLUMNS.map((column) => {
                                                        const cell = row.feedback[column.key];
                                                        return (
                                                            <div
                                                                key={`${row.player.id}-${column.key}`}
                                                                className={`whoami__cell whoami__cell--${cell.status}`}
                                                            >
                                                                <span className="whoami__cell-label">{t(`whoamiGame.feedback.${column.labelKey}`)}</span>
                                                                <span className="whoami__cell-value">
                                                                    {cell.value}
                                                                    {cell.indicator ? ` ${cell.indicator}` : ''}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default WhoAmI;
