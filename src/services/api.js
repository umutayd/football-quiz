// API-Football Configuration
// Get your API key from: https://www.api-football.com/

const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY || '';
const BASE_URL = 'https://v3.football.api-sports.io';

// Headers for API requests
const headers = {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io'
};

// Helper function for API calls
async function apiCall(endpoint, params = {}) {
    const url = new URL(`${BASE_URL}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
}

// API Functions
export const footballApi = {
    // Get leagues
    getLeagues: (params = {}) => apiCall('/leagues', params),

    // Get teams
    getTeams: (params = {}) => apiCall('/teams', params),

    // Get team information
    getTeamInfo: (teamId) => apiCall('/teams', { id: teamId }),

    // Get players
    getPlayers: (params = {}) => apiCall('/players', params),

    // Get top scorers
    getTopScorers: (leagueId, season) => apiCall('/players/topscorers', { league: leagueId, season }),

    // Get fixtures/matches
    getFixtures: (params = {}) => apiCall('/fixtures', params),

    // Get standings
    getStandings: (leagueId, season) => apiCall('/standings', { league: leagueId, season }),

    // Get player statistics
    getPlayerStats: (playerId, season) => apiCall('/players', { id: playerId, season }),

    // Check if API key is configured
    isConfigured: () => !!API_KEY
};

// Popular leagues for quiz questions
export const POPULAR_LEAGUES = {
    PREMIER_LEAGUE: 39,
    LA_LIGA: 140,
    BUNDESLIGA: 78,
    SERIE_A: 135,
    LIGUE_1: 61,
    CHAMPIONS_LEAGUE: 2,
    SUPER_LIG: 203 // Turkish Super Lig
};

// Current season
export const CURRENT_SEASON = 2024;

export default footballApi;
