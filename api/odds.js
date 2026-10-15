module.exports = async (req, res) => {
  const mode = (process.env.ODDS_MODE || 'mock').toLowerCase();
  const cacheTtl = Number(process.env.ODDS_CACHE_TTL_MS || 5000);
  const now = Date.now();

  // In-memory cache shared across requests in the same instance
  if (!global.__simulated_cache) global.__simulated_cache = { ts: 0, data: null };

  const mockBase = [
    {
      id: 'match-1',
      league: 'EPL',
      teams: 'Manchester City vs Arsenal',
      time: 'Tonight 22:30',
      market: 'Over / Under 2.5',
      side1: 'Over 2.5',
      side2: 'Under 2.5',
      odds1: 1.95,
      odds2: 2.08,
      roi: 2.45,
      book1: 'Pinnacle',
      book2: '1xLite',
      link1: 'https://www.pinnacle.com/en/',
      link2: 'https://1xlite-34606.com/en'
    },
    {
      id: 'match-2',
      league: 'LaLiga',
      teams: 'Real Madrid vs Barcelona',
      time: 'Tomorrow 02:00',
      market: 'Asian Handicap (-0.5)',
      side1: 'Real Madrid -0.5',
      side2: 'Barcelona +0.5',
      odds1: 2.02,
      odds2: 2.01,
      roi: 1.85,
      book1: 'Pinnacle',
      book2: '1xLite',
      link1: 'https://www.pinnacle.com/en/',
      link2: 'https://1xlite-34606.com/en'
    },
    {
      id: 'match-3',
      league: 'EPL',
      teams: 'Liverpool vs Chelsea',
      time: 'Saturday 19:30',
      market: 'Over / Under 3.0',
      side1: 'Over 3.0',
      side2: 'Under 3.0',
      odds1: 1.98,
      odds2: 2.05,
      roi: 2.10,
      book1: 'Pinnacle',
      book2: '1xLite',
      link1: 'https://www.pinnacle.com/en/',
      link2: 'https://1xlite-34606.com/en'
    }
  ];

  // Simulated live feed: slight random tweaks so it feels live without external APIs
  const live = mockBase.map((m, idx) => {
    const tick = (now / 1000 + idx * 7) % 13;
    const drift1 = 1 + ((Math.sin(tick) + 1) * 0.012);
    const drift2 = 1 + ((Math.cos(tick * 1.1) + 1) * 0.012);
    const odds1 = Number((m.odds1 * drift1).toFixed(3));
    const odds2 = Number((m.odds2 * drift2).toFixed(3));
    return {
      ...m,
      odds1,
      odds2,
      roi: Number((((1 / ((1 / odds1) + (1 / odds2))) - 1) * 100).toFixed(2))
    };
  });

  // If using simulate mode or no API configured, return simulated live data
  if (mode === 'simulate' || mode === 'mock' || !process.env.ODDS_API_URL) {
    if (global.__simulated_cache.data && (now - global.__simulated_cache.ts) < cacheTtl) {
      return res.status(200).json(global.__simulated_cache.data);
    }
    global.__simulated_cache = { ts: now, data: live };
    return res.status(200).json(live);
  }

  // If a real API is configured, let it win.
  try {
    const apiUrl = process.env.ODDS_API_URL;
    const apiKey = process.env.ODDS_API_KEY || '';
    const authHeader = process.env.ODDS_AUTH_HEADER || 'X-API-Key';
    const headers = { Accept: 'application/json' };
    if (apiKey) {
      headers[authHeader] = apiKey;
      if (!headers.Authorization) headers.Authorization = `Bearer ${apiKey}`;
    }

    const upstream = await fetch(apiUrl, { headers, method: 'GET' });
    if (!upstream.ok) {
      console.warn('Upstream odds fetch failed; using simulated fallback', upstream.status);
      return res.status(200).json(global.__simulated_cache.data || live);
    }

    const payload = await upstream.json();
    const normalized = normalizeOdds(payload);
    global.__simulated_cache = { ts: now, data: normalized };
    return res.status(200).json(normalized);
  } catch (err) {
    console.error('Error fetching upstream odds, using simulated fallback', err);
    return res.status(200).json(global.__simulated_cache.data || live);
  }
};

function normalizeOdds(payload) {
  if (Array.isArray(payload)) return payload.map((p, i) => mapEntry(p, i));
  const entries = payload.data || payload.results || payload.markets || payload.events || [];
  if (Array.isArray(entries)) return entries.map((p, i) => mapEntry(p, i));
  return [mapEntry(payload, 0)];
}

function mapEntry(p, idx) {
  const odds1 = Number(p.odds1 ?? p.home_price ?? p.prices?.[0]?.price ?? p.price_1 ?? p.home_odds ?? 1.0) || 1.0;
  const odds2 = Number(p.odds2 ?? p.away_price ?? p.prices?.[1]?.price ?? p.price_2 ?? p.away_odds ?? 1.0) || 1.0;
  const home = p.home_team ?? p.home ?? p.teamA ?? (Array.isArray(p.teams) ? p.teams[0] : undefined) ?? 'Side 1';
  const away = p.away_team ?? p.away ?? p.teamB ?? (Array.isArray(p.teams) ? p.teams[1] : undefined) ?? 'Side 2';
  const teams = p.match_name ?? p.name ?? (home && away ? `${home} vs ${away}` : `Match ${idx + 1}`);

  return {
    id: p.id || p.eventId || p.match_id || `match-${idx + 1}`,
    league: p.league ?? p.sport ?? p.tournament ?? 'Unknown',
    teams,
    time: p.commence_time ?? p.start_time ?? p.time ?? p.match_time ?? 'Unknown',
    market: p.market ?? p.market_type ?? 'Live odds',
    side1: p.side1 ?? home,
    side2: p.side2 ?? away,
    odds1,
    odds2,
    roi: Number((((1 / ((1 / odds1) + (1 / odds2))) - 1) * 100).toFixed(2)),
    book1: p.book1 ?? 'Pinnacle',
    book2: p.book2 ?? '1xLite',
    link1: p.link1 ?? 'https://www.pinnacle.com/en/',
    link2: p.link2 ?? 'https://1xlite-34606.com/en'
  };
}
