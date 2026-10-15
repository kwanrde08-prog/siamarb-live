module.exports = async (req, res) => {
  // Simple serverless odds adapter with header-based API key support and in-memory caching.
  // Environment variables used:
  // - ODDS_MODE = 'poll' | 'mock' (default mock)
  // - ODDS_PROVIDER = 'pinnacle' (informational)
  // - ODDS_API_URL = upstream REST URL
  // - ODDS_API_KEY = secret key (not committed)
  // - ODDS_AUTH_HEADER = header name to send key in (default: 'X-API-Key')
  // - ODDS_CACHE_TTL_MS = how long to cache upstream results server-side (default: 5000)

  try {
    const mode = (process.env.ODDS_MODE || 'mock').toLowerCase();
    const provider = (process.env.ODDS_PROVIDER || '').toLowerCase();

    // Very small in-memory cache to avoid hammering upstream when many clients poll /api/odds
    // This cache is per serverless instance and resets when instance restarts.
    if (!global.__odds_cache) global.__odds_cache = { ts: 0, data: null };
    const cacheTtl = Number(process.env.ODDS_CACHE_TTL_MS || 5000);
    const now = Date.now();

    // Helper: return mock dataset (safe fallback)
    const mock = [
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
      }
    ];

    // If mock mode or no upstream configured, return mock immediately
    if (mode === 'mock' || !process.env.ODDS_API_URL) {
      return res.status(200).json(mock);
    }

    // Serve cached response if still fresh
    if (global.__odds_cache.data && (now - global.__odds_cache.ts) < cacheTtl) {
      return res.status(200).json(global.__odds_cache.data);
    }

    // Prepare headers for upstream call
    const upstreamUrl = process.env.ODDS_API_URL;
    const apiKey = process.env.ODDS_API_KEY || '';
    const authHeader = process.env.ODDS_AUTH_HEADER || 'X-API-Key';

    const headers = { Accept: 'application/json' };
    if (apiKey) {
      // Put API key in configured header name
      headers[authHeader] = apiKey;
      // Also include Authorization Bearer as fallback if provider expects it
      if (!headers['Authorization']) headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Fetch upstream
    const upstream = await fetch(upstreamUrl, { headers, method: 'GET' });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      console.warn('Upstream odds fetch failed', upstream.status, text);
      // Return mock as graceful fallback
      return res.status(200).json(mock);
    }

    const payload = await upstream.json().catch(() => null);
    if (!payload) return res.status(200).json(mock);

    // Normalize into our internal schema
    const normalized = normalizeOdds(payload);

    // Cache and return
    global.__odds_cache = { ts: Date.now(), data: normalized };
    return res.status(200).json(normalized);
  } catch (err) {
    console.error('/api/odds error', err);
    return res.status(500).json({ error: 'failed to load odds', message: String(err) });
  }
};

function normalizeOdds(payload) {
  // Try to be flexible: handle arrays or known shapes
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.map((p, i) => mapEntry(p, i));
  }

  // Some providers wrap results in data/results/markets
  const entries = payload.data || payload.results || payload.markets || payload.events || [];
  if (Array.isArray(entries) && entries.length) return entries.map((p, i) => mapEntry(p, i));

  // Otherwise, attempt to map top-level object
  return [mapEntry(payload, 0)];
}

function mapEntry(p, idx) {
  // Provider-specific mapping heuristics for Pinnacle-like responses
  // Try common field names, fallback to defaults
  const odds1 = Number(p.odds1 ?? p.home_price ?? p.prices?.[0]?.price ?? p.price_1 ?? p.home_odds ?? 0) || 0;
  const odds2 = Number(p.odds2 ?? p.away_price ?? p.prices?.[1]?.price ?? p.price_2 ?? p.away_odds ?? 0) || 0;

  const home = p.home_team ?? p.home ?? p.teamA ?? (Array.isArray(p.teams) ? p.teams[0] : undefined) ?? null;
  const away = p.away_team ?? p.away ?? p.teamB ?? (Array.isArray(p.teams) ? p.teams[1] : undefined) ?? null;

  const teams = p.match_name ?? p.name ?? (home && away ? `${home} vs ${away}` : (p.teams ? p.teams.join(' vs ') : `Match ${idx + 1}`));

  return {
    id: p.id || p.eventId || p.match_id || `match-${idx + 1}`,
    league: p.league ?? p.sport ?? p.tournament ?? 'Unknown',
    teams: teams,
    time: p.commence_time ?? p.start_time ?? p.time ?? p.match_time ?? 'Unknown',
    market: p.market ?? p.market_type ?? 'unknown',
    side1: p.side1 ?? home ?? p.option_1 ?? 'Side 1',
    side2: p.side2 ?? away ?? p.option_2 ?? 'Side 2',
    odds1: odds1 || 1.0,
    odds2: odds2 || 1.0,
    roi: calcRoi(odds1 || 1.0, odds2 || 1.0),
    book1: p.book1 ?? p.bookmaker ?? 'Pinnacle',
    book2: p.book2 ?? 'opponent' ?? '1xLite',
    link1: p.link1 ?? p.bookmakerUrl ?? 'https://www.pinnacle.com/en/',
    link2: p.link2 ?? 'https://1xlite-34606.com/en'
  };
}

function calcRoi(a, b) {
  const inv = (1 / a) + (1 / b);
  if (inv <= 0) return 0;
  const roi = (1 / inv - 1) * 100;
  return Number((roi).toFixed(2));
}
