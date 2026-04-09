import { sportsDb, SOCCER_LEAGUES } from './sportsDbApi';
import { WHO_AM_I_PLAYERS as FALLBACK_PLAYERS } from '../data/whoAmIPlayers';

const CACHE_KEY = 'football_quiz_whoami_pool_cache_v3';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_TEAMS_PER_LEAGUE = 3;
const MIN_POOL_SIZE = 40;
const REQUEST_DELAY_MS = 120;

const LEAGUES = [
    {
        apiName: SOCCER_LEAGUES.PREMIER_LEAGUE.name,
        label: 'Premier League',
        priorityTeams: ['Manchester City', 'Arsenal', 'Liverpool', 'Chelsea', 'Manchester United', 'Tottenham']
    },
    {
        apiName: SOCCER_LEAGUES.LA_LIGA.name,
        label: 'LaLiga',
        priorityTeams: ['Real Madrid', 'Barcelona', 'Atletico Madrid', 'Athletic Bilbao']
    },
    {
        apiName: SOCCER_LEAGUES.SERIE_A.name,
        label: 'Serie A',
        priorityTeams: ['Inter Milan', 'AC Milan', 'Juventus', 'Napoli', 'Roma']
    },
    {
        apiName: SOCCER_LEAGUES.LIGUE_1.name,
        label: 'Ligue 1',
        priorityTeams: ['Paris SG', 'Marseille', 'Lille', 'Monaco', 'Lyon']
    }
];

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function normalizeText(value) {
    return (value || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function normalizeName(name) {
    return normalizeText(name);
}

function mapPosition(position) {
    const normalized = normalizeText(position);

    if (!normalized) return null;
    if (normalized.includes('goal')) return 'GK';
    if (normalized.includes('back') || normalized.includes('defen')) return 'DEF';
    if (normalized.includes('mid')) return 'MF';
    if (normalized.includes('wing') || normalized.includes('forward') || normalized.includes('striker') || normalized.includes('attack')) {
        return 'FW';
    }

    return 'MF';
}

function parseShirtNumber(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return null;
    if (parsed <= 0 || parsed > 99) return null;
    return parsed;
}

function isValidBirthDate(value) {
    if (!value) return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function transformPlayer(rawPlayer, leagueLabel, fallbackTeamName) {
    const id = rawPlayer.idPlayer;
    const name = (rawPlayer.strPlayer || '').trim();
    const nationality = (rawPlayer.strNationality || '').trim();
    const team = (rawPlayer.strTeam || fallbackTeamName || '').trim();
    const birthDate = rawPlayer.dateBorn;
    const shirtNumber = parseShirtNumber(rawPlayer.strNumber);
    const position = mapPosition(rawPlayer.strPosition);
    const photo = rawPlayer.strThumb || rawPlayer.strCutout;

    if (!id || !name || !nationality || !team || !position || !shirtNumber || !photo || !isValidBirthDate(birthDate)) {
        return null;
    }

    const status = normalizeText(rawPlayer.strStatus);
    if (status && status !== 'active') {
        return null;
    }

    return {
        id: String(id),
        name,
        nationality,
        league: leagueLabel,
        team,
        position,
        birthDate,
        shirtNumber,
        photo
    };
}

function pickLeagueTeams(teams, priorityTeamNames) {
    const selected = [];
    const usedIds = new Set();

    for (const priorityName of priorityTeamNames) {
        const found = teams.find((team) => normalizeText(team.strTeam) === normalizeText(priorityName));
        if (!found || usedIds.has(found.idTeam)) continue;

        selected.push(found);
        usedIds.add(found.idTeam);

        if (selected.length >= MAX_TEAMS_PER_LEAGUE) {
            return selected;
        }
    }

    for (const team of teams) {
        if (!team?.idTeam || usedIds.has(team.idTeam)) continue;

        selected.push(team);
        usedIds.add(team.idTeam);

        if (selected.length >= MAX_TEAMS_PER_LEAGUE) {
            break;
        }
    }

    return selected;
}

function dedupeAndSort(players) {
    const unique = new Map();

    players.forEach((player) => {
        const nameKey = normalizeName(player.name);
        if (!nameKey) return;

        if (!unique.has(nameKey)) {
            unique.set(nameKey, player);
        }
    });

    return Array.from(unique.values()).sort((a, b) => {
        return a.name.localeCompare(b.name, 'tr');
    });
}

function mergeWithFallback(apiPlayers) {
    const mergedByName = new Map();

    apiPlayers.forEach((player) => {
        mergedByName.set(normalizeName(player.name), player);
    });

    FALLBACK_PLAYERS.forEach((fallbackPlayer) => {
        const key = normalizeName(fallbackPlayer.name);
        const current = mergedByName.get(key);

        if (!current) {
            mergedByName.set(key, fallbackPlayer);
            return;
        }

        mergedByName.set(key, {
            ...current,
            nationality: current.nationality || fallbackPlayer.nationality,
            league: current.league || fallbackPlayer.league,
            team: current.team || fallbackPlayer.team,
            position: current.position || fallbackPlayer.position,
            birthDate: current.birthDate || fallbackPlayer.birthDate,
            shirtNumber: current.shirtNumber || fallbackPlayer.shirtNumber,
            photo: current.photo || fallbackPlayer.photo
        });
    });

    return Array.from(mergedByName.values());
}

function readCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed?.players?.length) return null;

        return parsed;
    } catch {
        return null;
    }
}

function writeCache(players) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            fetchedAt: Date.now(),
            players
        }));
    } catch {
        // Cache write can fail on private mode or full storage; ignore gracefully.
    }
}

async function fetchPlayersFromApi() {
    const collected = [];

    for (const league of LEAGUES) {
        let teams = [];

        try {
            teams = await sportsDb.getTeamsByLeague(league.apiName);
        } catch (error) {
            console.error(`WhoAmI team fetch failed (${league.apiName}):`, error);
            continue;
        }

        const targetTeams = pickLeagueTeams(teams || [], league.priorityTeams);

        for (const team of targetTeams) {
            try {
                const players = await sportsDb.getPlayersByTeam(team.idTeam);
                const transformed = (players || [])
                    .map((player) => transformPlayer(player, league.label, team.strTeam))
                    .filter(Boolean);

                collected.push(...transformed);
            } catch (error) {
                console.error(`WhoAmI player fetch failed (team ${team.idTeam}):`, error);
            }

            await sleep(REQUEST_DELAY_MS);
        }
    }

    return dedupeAndSort(collected);
}

export async function getWhoAmIPlayers({ forceRefresh = false } = {}) {
    const cache = readCache();
    const now = Date.now();

    if (!forceRefresh && cache && (now - cache.fetchedAt) < CACHE_TTL_MS) {
        return cache.players;
    }

    try {
        const apiPlayers = await fetchPlayersFromApi();
        const mergedPlayers = dedupeAndSort(mergeWithFallback(apiPlayers));

        if (mergedPlayers.length >= MIN_POOL_SIZE) {
            writeCache(mergedPlayers);
            return mergedPlayers;
        }

        throw new Error(`WhoAmI pool too small: ${mergedPlayers.length}`);
    } catch (error) {
        console.error('WhoAmI API fallback:', error);

        if (cache?.players?.length) {
            return cache.players;
        }

        return FALLBACK_PLAYERS;
    }
}

export default { getWhoAmIPlayers };
