export async function onRequest(context) {
  const request = context.request;
  const env = context.env;
  const url = new URL(request.url);
  const provider = readParam(url, 'provider');
  try {
    if (provider === 'steam') return await handleSteam(url, env);
    if (provider === 'faceit') return await handleFaceit(url, env);
    if (provider === 'riot') return await handleRiot(url, env);
    return json({ error: 'DATA_UNAVAILABLE' }, 502);
  } catch (e) {
    return json({ error: 'DATA_UNAVAILABLE' }, 502);
  }
}

function readParam(url, key) {
  const v = url.searchParams.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  if (s === '') return null;
  return s;
}

async function handleSteam(url, env) {
  const q = readParam(url, 'q');
  if (q === null) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  const steamid = await resolveSteamId(q, env);
  if (steamid === null) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  const statsPromise = fetchSteamStats(steamid, env);
  const profilePromise = fetchSteamProfile(steamid, env);
  const stats = await statsPromise;
  const profile = await profilePromise;
  if (!Array.isArray(stats)) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  if (stats.length === 0) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  if (profile === null) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  if (profile.personaname === undefined) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  if (profile.personaname === null) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  if (profile.personaname === '') return json({ error: 'DATA_UNAVAILABLE' }, 502);
  return json({ profile, stats });
}

async function handleFaceit(url, env) {
  const steamid = readParam(url, 'steamid');
  if (steamid === null) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  const faceit = await fetchFaceitStats(steamid, env);
  if (faceit === null) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  return json(faceit);
}

async function handleRiot(url, env) {
  const key = env.RIOT_API_KEY;
  if (!key) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  const kind = readParam(url, 'kind');
  if (kind === null) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  if (kind === 'account') return await riotAccount(url, key);
  if (kind === 'val_ranked_leaderboard') return await riotValRankedLeaderboard(url, key);
  return json({ error: 'DATA_UNAVAILABLE' }, 502);
}

async function riotAccount(url, key) {
  const region = readParam(url, 'region');
  const gameName = readParam(url, 'gameName');
  const tagLine = readParam(url, 'tagLine');
  if (region === null) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  if (gameName === null) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  if (tagLine === null) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  const allowed = new Set(['americas', 'europe', 'asia']);
  if (!allowed.has(region)) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  const endpoint = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const res = await fetch(endpoint, { headers: { 'X-Riot-Token': key } });
  if (!res.ok) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  const data = await res.json();
  return json(data);
}

async function riotValRankedLeaderboard(url, key) {
  const platform = readParam(url, 'platform');
  const actId = readParam(url, 'actId');
  const size = readParam(url, 'size');
  const startIndex = readParam(url, 'startIndex');
  if (platform === null) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  if (actId === null) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  if (size === null) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  if (startIndex === null) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  const allowed = new Set(['na', 'eu', 'ap', 'kr', 'br', 'latam']);
  if (!allowed.has(platform)) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  const endpoint = `https://${platform}.api.riotgames.com/val/ranked/v1/leaderboards/by-act/${encodeURIComponent(actId)}?size=${encodeURIComponent(size)}&startIndex=${encodeURIComponent(startIndex)}`;
  const res = await fetch(endpoint, { headers: { 'X-Riot-Token': key } });
  if (!res.ok) return json({ error: 'DATA_UNAVAILABLE' }, 502);
  const data = await res.json();
  return json(data);
}

async function resolveSteamId(q, env) {
  const s = String(q).trim();
  if (/^\d{17}$/.test(s)) return s;
  const profMatch = s.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (profMatch) return profMatch[1];
  const vanityMatch = s.match(/steamcommunity\.com\/id\/([^\/\s]+)/i);
  let vanity = s;
  if (vanityMatch) vanity = vanityMatch[1];
  const key = env.STEAM_API_KEY;
  if (!key) throw new Error('Missing STEAM_API_KEY');
  const res = await fetch(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${encodeURIComponent(key)}&vanityurl=${encodeURIComponent(vanity)}`);
  if (!res.ok) return null;
  const data = await res.json();
  const response = data && data.response ? data.response : null;
  if (response === null) return null;
  if (response.success !== 1) return null;
  if (!response.steamid) return null;
  return response.steamid;
}

async function fetchSteamStats(steamid, env) {
  const key = env.STEAM_API_KEY;
  if (!key) throw new Error('Missing STEAM_API_KEY');
  const res = await fetch(`https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/?key=${encodeURIComponent(key)}&steamid=${encodeURIComponent(steamid)}&appid=730`);
  if (!res.ok) return null;
  const data = await res.json();
  const playerstats = data && data.playerstats ? data.playerstats : null;
  if (playerstats === null) return null;
  const stats = playerstats.stats;
  if (!Array.isArray(stats)) return null;
  return stats.map(s => ({ name: s.name, value: s.value }));
}

async function fetchSteamProfile(steamid, env) {
  const key = env.STEAM_API_KEY;
  if (!key) throw new Error('Missing STEAM_API_KEY');
  const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(key)}&steamids=${encodeURIComponent(steamid)}`);
  if (!res.ok) return null;
  const data = await res.json();
  const response = data && data.response ? data.response : null;
  if (response === null) return null;
  const players = response.players;
  if (!Array.isArray(players)) return null;
  if (players.length === 0) return null;
  const player = players[0];
  if (!player) return null;
  return {
    steamid,
    personaname: player.personaname,
    avatarfull: player.avatarfull,
    profileurl: player.profileurl
  };
}

async function fetchFaceitStats(steamid, env) {
  const key = env.FACEIT_API_KEY;
  if (!key) throw new Error('Missing FACEIT_API_KEY');
  const player = await fetchFaceitPlayerBySteam(key, steamid, 'cs2');
  if (player === null) return null;
  const stats = await fetchFaceitPlayerStats(key, player.player_id, 'cs2');
  if (stats === null) return null;
  const lifetime = stats.lifetime;
  if (!lifetime) return null;
  const games = player.games;
  if (!games) return null;
  const gInfo = games.cs2;
  if (!gInfo) return null;
  if (typeof gInfo.skill_level !== 'number') return null;
  if (typeof gInfo.faceit_elo !== 'number') return null;
  return {
    found: true,
    player_id: player.player_id,
    nickname: player.nickname,
    level: gInfo.skill_level,
    elo: gInfo.faceit_elo
  };
}

async function fetchFaceitPlayerBySteam(key, steamid, game) {
  const res = await fetch(`https://open.faceit.com/data/v4/players?game=${encodeURIComponent(game)}&steam_id=${encodeURIComponent(steamid)}`, {
    headers: { Authorization: `Bearer ${key}` }
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data) return null;
  if (!data.player_id) return null;
  return data;
}

async function fetchFaceitPlayerStats(key, player_id, game) {
  const res = await fetch(`https://open.faceit.com/data/v4/players/${encodeURIComponent(player_id)}/stats/${encodeURIComponent(game)}`, {
    headers: { Authorization: `Bearer ${key}` }
  });
  if (!res.ok) return null;
  return await res.json();
}

function json(obj, status) {
  const code = typeof status === 'number' ? status : 200;
  return new Response(JSON.stringify(obj), {
    status: code,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store'
    }
  });
}
