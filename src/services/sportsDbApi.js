// TheSportsDB API Service
// Free API - No registration required
// Limit: 100 requests per minute

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/3';

// API Functions
async function apiCall(endpoint) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('TheSportsDB API Error:', error);
        throw error;
    }
}

export const sportsDb = {
    // Search for teams by name
    searchTeams: async (teamName) => {
        const data = await apiCall(`/searchteams.php?t=${encodeURIComponent(teamName)}`);
        return data.teams || [];
    },

    // Search for players by name
    searchPlayers: async (playerName) => {
        const data = await apiCall(`/searchplayers.php?p=${encodeURIComponent(playerName)}`);
        return data.player || [];
    },

    // Get all teams in a league
    getTeamsByLeague: async (leagueName) => {
        const data = await apiCall(`/search_all_teams.php?l=${encodeURIComponent(leagueName)}`);
        return data.teams || [];
    },

    // Get all players in a team
    getPlayersByTeam: async (teamId) => {
        const data = await apiCall(`/lookup_all_players.php?id=${teamId}`);
        return data.player || [];
    },

    // Get team details
    getTeamDetails: async (teamId) => {
        const data = await apiCall(`/lookupteam.php?id=${teamId}`);
        return data.teams?.[0] || null;
    },

    // Get player details
    getPlayerDetails: async (playerId) => {
        const data = await apiCall(`/lookupplayer.php?id=${playerId}`);
        return data.players?.[0] || null;
    },

    // Get league table/standings
    getLeagueTable: async (leagueId, season) => {
        const data = await apiCall(`/lookuptable.php?l=${leagueId}&s=${season}`);
        return data.table || [];
    },

    // Get all leagues
    getAllLeagues: async () => {
        const data = await apiCall('/all_leagues.php');
        return data.leagues || [];
    },

    // Get leagues by country
    getLeaguesByCountry: async (country) => {
        const data = await apiCall(`/search_all_leagues.php?c=${encodeURIComponent(country)}&s=Soccer`);
        return data.countries || [];
    },

    // Get past events for a team
    getLastEvents: async (teamId) => {
        const data = await apiCall(`/eventslast.php?id=${teamId}`);
        return data.results || [];
    },

    // Get next events for a team
    getNextEvents: async (teamId) => {
        const data = await apiCall(`/eventsnext.php?id=${teamId}`);
        return data.events || [];
    },

    // Lookup league details
    getLeagueDetails: async (leagueId) => {
        const data = await apiCall(`/lookupleague.php?id=${leagueId}`);
        return data.leagues?.[0] || null;
    }
};

// Popular Soccer Leagues with their IDs
export const SOCCER_LEAGUES = {
    PREMIER_LEAGUE: { id: '4328', name: 'English Premier League', country: 'England' },
    LA_LIGA: { id: '4335', name: 'Spanish La Liga', country: 'Spain' },
    BUNDESLIGA: { id: '4331', name: 'German Bundesliga', country: 'Germany' },
    SERIE_A: { id: '4332', name: 'Italian Serie A', country: 'Italy' },
    LIGUE_1: { id: '4334', name: 'French Ligue 1', country: 'France' },
    SUPER_LIG: { id: '4339', name: 'Turkish Super Lig', country: 'Turkey' },
    EREDIVISIE: { id: '4337', name: 'Dutch Eredivisie', country: 'Netherlands' },
    PRIMEIRA_LIGA: { id: '4344', name: 'Portuguese Primeira Liga', country: 'Portugal' }
};

// Popular team IDs for faster access
export const POPULAR_TEAMS = {
    // Premier League
    MANCHESTER_CITY: '133613',
    LIVERPOOL: '133602',
    ARSENAL: '133604',
    CHELSEA: '133610',
    MANCHESTER_UNITED: '133612',
    TOTTENHAM: '133616',
    // La Liga
    REAL_MADRID: '133738',
    BARCELONA: '133739',
    ATLETICO_MADRID: '133703',
    // Bundesliga
    BAYERN_MUNICH: '133674',
    BORUSSIA_DORTMUND: '133678',
    BAYER_LEVERKUSEN: '133680',
    // Serie A
    INTER_MILAN: '133694',
    AC_MILAN: '133688',
    JUVENTUS: '133676',
    NAPOLI: '134585',
    // Ligue 1
    PSG: '133714',
    // Super Lig
    GALATASARAY: '134777',
    FENERBAHCE: '134778',
    BESIKTAS: '134776'
};

export default sportsDb;
