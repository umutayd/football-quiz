// Dynamic Question Generator using TheSportsDB API
// Free API - No registration required - 100 requests/minute

import { sportsDb, SOCCER_LEAGUES, POPULAR_TEAMS } from './sportsDbApi';

// Cache for API data to reduce API calls
const dataCache = {
    teams: new Map(),
    players: new Map(),
    tables: new Map(),
    lastFetch: {}
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Question templates
const QUESTION_TEMPLATES = {
    player: {
        team: {
            tr: 'Bu futbolcu hangi takımda oynuyor?',
            en: 'Which team does this player play for?'
        },
        nationality: {
            tr: 'Bu futbolcu hangi ülkeden?',
            en: 'Which country is this player from?'
        },
        position: {
            tr: 'Bu futbolcunun pozisyonu nedir?',
            en: "What is this player's position?"
        },
        birthplace: {
            tr: 'Bu futbolcu nerede doğdu?',
            en: 'Where was this player born?'
        }
    },
    team: {
        league: {
            tr: 'Bu takım hangi ligde oynuyor?',
            en: 'Which league does this team play in?'
        },
        country: {
            tr: 'Bu takım hangi ülkeden?',
            en: 'Which country is this team from?'
        },
        stadium: {
            tr: 'Bu takımın stadyumu hangisi?',
            en: "What is this team's stadium?"
        },
        founded: {
            tr: 'Bu takım hangi yılda kuruldu?',
            en: 'What year was this team founded?'
        }
    },
    stats: {
        champion: {
            tr: 'Bu ligin lideri hangi takım?',
            en: 'Which team leads this league?'
        }
    }
};

// League names for display
const LEAGUE_NAMES = {
    '4328': 'Premier League',
    '4335': 'La Liga',
    '4331': 'Bundesliga',
    '4332': 'Serie A',
    '4334': 'Ligue 1',
    '4339': 'Süper Lig',
    '4337': 'Eredivisie',
    '4344': 'Primeira Liga'
};

// Country names for wrong answers
const COUNTRIES = [
    'Argentina', 'Brazil', 'France', 'England', 'Spain', 'Germany',
    'Portugal', 'Netherlands', 'Belgium', 'Italy', 'Turkey', 'Poland',
    'Norway', 'Denmark', 'Sweden', 'Croatia', 'Serbia', 'Morocco',
    'Egypt', 'Senegal', 'Nigeria', 'Uruguay', 'Colombia', 'Mexico'
];

// Shuffle array helper
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Get random items from array
function getRandomItems(array, count) {
    return shuffle(array).slice(0, count);
}

// Get wrong options
function getWrongOptions(correctAnswer, allOptions, count = 3) {
    const filtered = allOptions.filter(opt => opt !== correctAnswer && opt);
    return getRandomItems(filtered, count);
}

// Fetch teams from a league
async function fetchLeagueTeams(leagueName) {
    const cacheKey = leagueName;

    if (dataCache.teams.has(cacheKey)) {
        const cached = dataCache.teams.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }
    }

    try {
        const teams = await sportsDb.getTeamsByLeague(leagueName);
        const processedTeams = teams.map(t => ({
            id: t.idTeam,
            name: t.strTeam,
            logo: t.strBadge || t.strTeamBadge,
            stadium: t.strStadium,
            stadiumThumb: t.strStadiumThumb,
            country: t.strCountry,
            founded: t.intFormedYear,
            league: leagueName,
            description: t.strDescriptionEN
        }));

        dataCache.teams.set(cacheKey, { data: processedTeams, timestamp: Date.now() });
        return processedTeams;
    } catch (error) {
        console.error('Error fetching teams:', error);
        return [];
    }
}

// Fetch players from a team
async function fetchTeamPlayers(teamId) {
    const cacheKey = teamId;

    if (dataCache.players.has(cacheKey)) {
        const cached = dataCache.players.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }
    }

    try {
        const players = await sportsDb.getPlayersByTeam(teamId);
        const processedPlayers = players.map(p => ({
            id: p.idPlayer,
            name: p.strPlayer,
            photo: p.strThumb || p.strCutout,
            nationality: p.strNationality,
            position: p.strPosition,
            birthplace: p.strBirthLocation,
            team: p.strTeam,
            teamId: teamId,
            number: p.strNumber,
            height: p.strHeight,
            weight: p.strWeight,
            description: p.strDescriptionEN
        }));

        dataCache.players.set(cacheKey, { data: processedPlayers, timestamp: Date.now() });
        return processedPlayers;
    } catch (error) {
        console.error('Error fetching players:', error);
        return [];
    }
}

// Fetch league table
async function fetchLeagueTable(leagueId, season = '2024-2025') {
    const cacheKey = `${leagueId}-${season}`;

    if (dataCache.tables.has(cacheKey)) {
        const cached = dataCache.tables.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }
    }

    try {
        const table = await sportsDb.getLeagueTable(leagueId, season);
        dataCache.tables.set(cacheKey, { data: table, timestamp: Date.now() });
        return table;
    } catch (error) {
        console.error('Error fetching table:', error);
        return [];
    }
}

// Generate player team question
function generatePlayerTeamQuestion(player, allTeams, difficulty) {
    if (!player.team) return null;
    const wrongTeams = getWrongOptions(player.team, allTeams.map(t => t.name), 3);
    if (wrongTeams.length < 3) return null;

    return {
        id: `pt-${player.id}-${Date.now()}-${Math.random()}`,
        type: 'player',
        subType: 'team',
        difficulty,
        question: QUESTION_TEMPLATES.player.team,
        subject: player.name,
        subjectImage: player.photo,
        correctAnswer: player.team,
        options: shuffle([player.team, ...wrongTeams]),
        points: difficulty === 'easy' ? 100 : difficulty === 'medium' ? 150 : 200
    };
}

// Generate player nationality question
function generatePlayerNationalityQuestion(player, difficulty) {
    if (!player.nationality) return null;
    const wrongCountries = getWrongOptions(player.nationality, COUNTRIES, 3);
    if (wrongCountries.length < 3) return null;

    return {
        id: `pn-${player.id}-${Date.now()}-${Math.random()}`,
        type: 'player',
        subType: 'nationality',
        difficulty,
        question: QUESTION_TEMPLATES.player.nationality,
        subject: player.name,
        subjectImage: player.photo,
        correctAnswer: player.nationality,
        options: shuffle([player.nationality, ...wrongCountries]),
        points: difficulty === 'easy' ? 100 : difficulty === 'medium' ? 150 : 200
    };
}

// Generate player position question
function generatePlayerPositionQuestion(player, difficulty) {
    const positions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Centre-Back', 'Right-Back', 'Left-Back'];
    if (!player.position) return null;

    const wrongPositions = getWrongOptions(player.position, positions, 3);
    if (wrongPositions.length < 3) return null;

    return {
        id: `pp-${player.id}-${Date.now()}-${Math.random()}`,
        type: 'player',
        subType: 'position',
        difficulty,
        question: QUESTION_TEMPLATES.player.position,
        subject: player.name,
        subjectImage: player.photo,
        correctAnswer: player.position,
        options: shuffle([player.position, ...wrongPositions]),
        points: difficulty === 'easy' ? 100 : difficulty === 'medium' ? 150 : 200
    };
}

// Generate team country question
function generateTeamCountryQuestion(team, difficulty) {
    if (!team.country) return null;
    const wrongCountries = getWrongOptions(team.country, COUNTRIES, 3);
    if (wrongCountries.length < 3) return null;

    return {
        id: `tc-${team.id}-${Date.now()}-${Math.random()}`,
        type: 'team',
        subType: 'country',
        difficulty,
        question: QUESTION_TEMPLATES.team.country,
        subject: team.name,
        subjectImage: team.logo,
        correctAnswer: team.country,
        options: shuffle([team.country, ...wrongCountries]),
        points: difficulty === 'easy' ? 100 : difficulty === 'medium' ? 150 : 200
    };
}

// Generate team stadium question
function generateTeamStadiumQuestion(team, allTeams, difficulty) {
    if (!team.stadium) return null;
    const wrongStadiums = getWrongOptions(team.stadium, allTeams.filter(t => t.stadium).map(t => t.stadium), 3);
    if (wrongStadiums.length < 3) return null;

    return {
        id: `ts-${team.id}-${Date.now()}-${Math.random()}`,
        type: 'team',
        subType: 'stadium',
        difficulty,
        question: QUESTION_TEMPLATES.team.stadium,
        subject: team.name,
        subjectImage: team.logo,
        correctAnswer: team.stadium,
        options: shuffle([team.stadium, ...wrongStadiums]),
        points: difficulty === 'easy' ? 100 : difficulty === 'medium' ? 150 : 200
    };
}

// Generate team founded question
function generateTeamFoundedQuestion(team, allTeams, difficulty) {
    if (!team.founded) return null;
    const wrongYears = allTeams
        .filter(t => t.founded && t.founded !== team.founded)
        .map(t => t.founded);
    const uniqueWrongYears = [...new Set(wrongYears)].slice(0, 3);
    if (uniqueWrongYears.length < 3) return null;

    return {
        id: `tf-${team.id}-${Date.now()}-${Math.random()}`,
        type: 'team',
        subType: 'founded',
        difficulty,
        question: QUESTION_TEMPLATES.team.founded,
        subject: team.name,
        subjectImage: team.logo,
        correctAnswer: team.founded,
        options: shuffle([team.founded, ...uniqueWrongYears]),
        points: difficulty === 'easy' ? 100 : difficulty === 'medium' ? 150 : 200
    };
}

// Main question generator
export async function generateQuestions(category, difficulty, count = 10) {
    const questions = [];

    // Select leagues based on difficulty
    let selectedLeagues;
    if (difficulty === 'easy') {
        selectedLeagues = [
            SOCCER_LEAGUES.PREMIER_LEAGUE,
            SOCCER_LEAGUES.LA_LIGA,
            SOCCER_LEAGUES.BUNDESLIGA
        ];
    } else if (difficulty === 'medium') {
        selectedLeagues = [
            SOCCER_LEAGUES.PREMIER_LEAGUE,
            SOCCER_LEAGUES.LA_LIGA,
            SOCCER_LEAGUES.BUNDESLIGA,
            SOCCER_LEAGUES.SERIE_A,
            SOCCER_LEAGUES.SUPER_LIG
        ];
    } else {
        selectedLeagues = Object.values(SOCCER_LEAGUES);
    }

    try {
        // Pick random leagues
        const randomLeagues = getRandomItems(selectedLeagues, 3);
        let allTeams = [];
        let allPlayers = [];

        // Fetch data from each league
        for (const league of randomLeagues) {
            const teams = await fetchLeagueTeams(league.name);
            allTeams.push(...teams);

            // Get players from popular teams
            const popularTeamIds = Object.values(POPULAR_TEAMS);
            const leagueTeamIds = teams.map(t => t.id).filter(id => popularTeamIds.includes(id));
            const teamsToFetch = leagueTeamIds.length > 0 ? leagueTeamIds : teams.slice(0, 3).map(t => t.id);

            for (const teamId of teamsToFetch.slice(0, 2)) {
                const players = await fetchTeamPlayers(teamId);
                allPlayers.push(...players.filter(p => p.photo && p.name));
            }
        }

        // Generate player questions
        if (category === 'player' || category === 'mixed') {
            const eligiblePlayers = allPlayers.filter(p => p.photo && p.name && p.team);
            const randomPlayers = getRandomItems(eligiblePlayers, 10);

            for (const player of randomPlayers) {
                const questionTypes = ['team', 'nationality'];
                if (player.position) questionTypes.push('position');

                const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];

                let question;
                switch (type) {
                    case 'team':
                        question = generatePlayerTeamQuestion(player, allTeams, difficulty);
                        break;
                    case 'nationality':
                        question = generatePlayerNationalityQuestion(player, difficulty);
                        break;
                    case 'position':
                        question = generatePlayerPositionQuestion(player, difficulty);
                        break;
                }
                if (question) questions.push(question);
            }
        }

        // Generate team questions
        if (category === 'team' || category === 'mixed') {
            const randomTeams = getRandomItems(allTeams.filter(t => t.logo), 8);

            for (const team of randomTeams) {
                const questionTypes = ['country'];
                if (team.stadium) questionTypes.push('stadium');
                if (team.founded) questionTypes.push('founded');

                const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];

                let question;
                switch (type) {
                    case 'country':
                        question = generateTeamCountryQuestion(team, difficulty);
                        break;
                    case 'stadium':
                        question = generateTeamStadiumQuestion(team, allTeams, difficulty);
                        break;
                    case 'founded':
                        question = generateTeamFoundedQuestion(team, allTeams, difficulty);
                        break;
                }
                if (question) questions.push(question);
            }
        }

        // Add match/stats fallback questions for variety
        if (category === 'match' || category === 'mixed') {
            const matchQuestions = generateFallbackMatchQuestions(difficulty);
            questions.push(...matchQuestions);
        }

    } catch (error) {
        console.error('Error generating questions from API:', error);
        // Fall back to static questions
        return generateFallbackQuestions(category, difficulty, count);
    }

    // If not enough questions, add fallback
    if (questions.length < count) {
        const fallback = generateFallbackQuestions(category, difficulty, count - questions.length);
        questions.push(...fallback);
    }

    // Shuffle and return requested count
    return shuffle(questions).slice(0, count);
}

// Fallback match questions
function generateFallbackMatchQuestions(difficulty) {
    const points = difficulty === 'easy' ? 100 : difficulty === 'medium' ? 150 : 200;
    return [
        {
            id: `m1-${Date.now()}`,
            type: 'stats',
            difficulty,
            question: { tr: '2022 Dünya Kupası\'nı kim kazandı?', en: 'Who won the 2022 World Cup?' },
            subject: 'World Cup 2022',
            subjectImage: 'https://www.thesportsdb.com/images/media/league/badge/q6d7dw1549536958.png',
            correctAnswer: 'Argentina',
            options: shuffle(['Argentina', 'France', 'Brazil', 'Germany']),
            points
        },
        {
            id: `m2-${Date.now()}`,
            type: 'stats',
            difficulty,
            question: { tr: 'En çok Şampiyonlar Ligi kazanan takım?', en: 'Most Champions League titles?' },
            subject: 'Champions League',
            subjectImage: 'https://www.thesportsdb.com/images/media/league/badge/wr4sc61556196320.png',
            correctAnswer: 'Real Madrid',
            options: shuffle(['Real Madrid', 'AC Milan', 'Bayern Munich', 'Liverpool']),
            points
        },
        {
            id: `m3-${Date.now()}`,
            type: 'stats',
            difficulty,
            question: { tr: 'Euro 2024\'ü kim kazandı?', en: 'Who won Euro 2024?' },
            subject: 'Euro 2024',
            subjectImage: 'https://www.thesportsdb.com/images/media/league/badge/8mi0521699872736.png',
            correctAnswer: 'Spain',
            options: shuffle(['Spain', 'England', 'Germany', 'France']),
            points
        }
    ];
}

// Fallback questions for offline mode
const FALLBACK_PLAYERS = [
    { id: 1, name: 'Erling Haaland', team: 'Manchester City', nationality: 'Norway', position: 'Forward', photo: 'https://www.thesportsdb.com/images/media/player/thumb/9wh5qe1701713134.jpg' },
    { id: 2, name: 'Kylian Mbappé', team: 'Real Madrid', nationality: 'France', position: 'Forward', photo: 'https://www.thesportsdb.com/images/media/player/thumb/yyu27s1719863469.jpg' },
    { id: 3, name: 'Jude Bellingham', team: 'Real Madrid', nationality: 'England', position: 'Midfielder', photo: 'https://www.thesportsdb.com/images/media/player/thumb/6xfp641687462951.jpg' },
    { id: 4, name: 'Vinícius Jr.', team: 'Real Madrid', nationality: 'Brazil', position: 'Forward', photo: 'https://www.thesportsdb.com/images/media/player/thumb/3fivck1543699698.jpg' },
    { id: 5, name: 'Mohamed Salah', team: 'Liverpool', nationality: 'Egypt', position: 'Forward', photo: 'https://www.thesportsdb.com/images/media/player/thumb/yqzl5e1564854459.jpg' },
    { id: 6, name: 'Kevin De Bruyne', team: 'Manchester City', nationality: 'Belgium', position: 'Midfielder', photo: 'https://www.thesportsdb.com/images/media/player/thumb/p9u0ck1545845440.jpg' },
    { id: 7, name: 'Robert Lewandowski', team: 'Barcelona', nationality: 'Poland', position: 'Forward', photo: 'https://www.thesportsdb.com/images/media/player/thumb/wn2xzy1566034927.jpg' },
    { id: 8, name: 'Harry Kane', team: 'Bayern Munich', nationality: 'England', position: 'Forward', photo: 'https://www.thesportsdb.com/images/media/player/thumb/m21j9e1564852912.jpg' },
    { id: 9, name: 'Bukayo Saka', team: 'Arsenal', nationality: 'England', position: 'Forward', photo: 'https://www.thesportsdb.com/images/media/player/thumb/f6o2a01620753787.jpg' },
    { id: 10, name: 'Rodri', team: 'Manchester City', nationality: 'Spain', position: 'Midfielder', photo: 'https://www.thesportsdb.com/images/media/player/thumb/4qw6g61623087063.jpg' }
];

const FALLBACK_TEAMS = [
    { id: 1, name: 'Manchester City', league: 'English Premier League', country: 'England', stadium: 'Etihad Stadium', logo: 'https://www.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png' },
    { id: 2, name: 'Real Madrid', league: 'Spanish La Liga', country: 'Spain', stadium: 'Santiago Bernabéu', logo: 'https://www.thesportsdb.com/images/media/team/badge/vxtrpq1467465081.png' },
    { id: 3, name: 'Barcelona', league: 'Spanish La Liga', country: 'Spain', stadium: 'Camp Nou', logo: 'https://www.thesportsdb.com/images/media/team/badge/tqurxw1420751428.png' },
    { id: 4, name: 'Bayern Munich', league: 'German Bundesliga', country: 'Germany', stadium: 'Allianz Arena', logo: 'https://www.thesportsdb.com/images/media/team/badge/ruvvxy1467466925.png' },
    { id: 5, name: 'Liverpool', league: 'English Premier League', country: 'England', stadium: 'Anfield', logo: 'https://www.thesportsdb.com/images/media/team/badge/uvxuqq1448813372.png' },
    { id: 6, name: 'Arsenal', league: 'English Premier League', country: 'England', stadium: 'Emirates Stadium', logo: 'https://www.thesportsdb.com/images/media/team/badge/vrtrtp1448813175.png' },
    { id: 7, name: 'Galatasaray', league: 'Turkish Super Lig', country: 'Turkey', stadium: 'Rams Park', logo: 'https://www.thesportsdb.com/images/media/team/badge/ysxpyu1448810438.png' },
    { id: 8, name: 'Fenerbahçe', league: 'Turkish Super Lig', country: 'Turkey', stadium: 'Şükrü Saracoğlu', logo: 'https://www.thesportsdb.com/images/media/team/badge/rtxsqy1448810326.png' }
];

function generateFallbackQuestions(category, difficulty, count) {
    const questions = [];
    const points = difficulty === 'easy' ? 100 : difficulty === 'medium' ? 150 : 200;

    if (category === 'player' || category === 'mixed') {
        const players = shuffle(FALLBACK_PLAYERS).slice(0, 6);
        for (const player of players) {
            questions.push({
                id: `fb-pt-${player.id}-${Date.now()}-${Math.random()}`,
                type: 'player',
                difficulty,
                question: QUESTION_TEMPLATES.player.team,
                subject: player.name,
                subjectImage: player.photo,
                correctAnswer: player.team,
                options: shuffle([player.team, ...getWrongOptions(player.team, FALLBACK_TEAMS.map(t => t.name), 3)]),
                points
            });
        }
    }

    if (category === 'team' || category === 'mixed') {
        const teams = shuffle(FALLBACK_TEAMS).slice(0, 4);
        for (const team of teams) {
            questions.push({
                id: `fb-ts-${team.id}-${Date.now()}-${Math.random()}`,
                type: 'team',
                difficulty,
                question: QUESTION_TEMPLATES.team.stadium,
                subject: team.name,
                subjectImage: team.logo,
                correctAnswer: team.stadium,
                options: shuffle([team.stadium, ...getWrongOptions(team.stadium, FALLBACK_TEAMS.map(t => t.stadium), 3)]),
                points
            });
        }
    }

    if (category === 'match' || category === 'mixed') {
        questions.push(...generateFallbackMatchQuestions(difficulty));
    }

    return shuffle(questions).slice(0, count);
}

// Shuffle options for a question
export function shuffleOptions(question) {
    return {
        ...question,
        options: shuffle(question.options)
    };
}

// Clear cache
export function clearCache() {
    dataCache.teams.clear();
    dataCache.players.clear();
    dataCache.tables.clear();
}

export default { generateQuestions, shuffleOptions, clearCache };
