// Vercel serverless function to return odds for the frontend.
// Behavior:
// - If ODDS_API_URL environment variable is set, this will proxy that URL and return JSON.
// - Otherwise, it returns a built-in mock dataset to let the frontend work without API keys.

module.exports = async (req, res) => {
  try {
    // Simple in-memory cache (only lasts per server instance)
    const CACHE_TTL = 15 * 1000; // 15s
    if (!global.__odds_cache) global.__odds_cache = { ts: 0, data: null };

    if (Date.now() - global.__odds_cache.ts < CACHE_TTL && global.__odds_cache.data) {
      return res.status(200).json(global.__odds_cache.data);
    }

    // If the deployer provided an ODDS_API_URL, proxy it (caller is responsible for API key/params)
    if (process.env.ODDS_API_URL) {
      const upstream = process.env.ODDS_API_URL;
      const upstreamRes = await fetch(upstream, { method: 'GET' });
      if (!upstreamRes.ok) throw new Error(`Upstream fetch failed: ${upstreamRes.status}`);
      const payload = await upstreamRes.json();

      // You may want to transform payload into the shape the frontend expects. For now we pass it through.
      global.__odds_cache = { ts: Date.now(), data: payload };
      return res.status(200).json(payload);
    }

    // No upstream provided — return a mock dataset compatible with the frontend shape
    const mock = [
      {
        id: 1,
        league: 'EPL',
        teams: 'แมนเชสเตอร์ ซิตี้ vs อาร์เซนอล',
        time: 'คืนนี้ 22:30 น.',
        market: 'Over / Under 2.5',
        side1: 'Over 2.5',
        side2: 'Under 2.5',
        odds1: 1.95,
        odds2: 2.08,
        roi: 2.45,
        book1: 'UEA8',
        book2: 'Roobet',
        link1: 'https://www.uea8chokdee.com/en-th/register?refid=okgvitjq',
        link2: 'https://roobet.com/?ref=beluga1999'
      },
      {
        id: 2,
        league: 'LaLiga',
        teams: 'เรอัล มาดริด vs บาร์เซโลนา',
        time: 'พรุ่งนี้ 02:00 น.',
        market: 'Asian Handicap (-0.5)',
        side1: 'เรอัล มาดริด -0.5',
        side2: 'บาร์เซโลนา +0.5',
        odds1: 2.02,
        odds2: 2.01,
        roi: 1.85,
        book1: 'UEA8',
        book2: 'Roobet',
        link1: 'https://www.uea8chokdee.com/en-th/register?refid=okgvitjq',
        link2: 'https://roobet.com/?ref=beluga1999'
      },
      {
        id: 3,
        league: 'EPL',
        teams: 'ลิเวอร์พูล vs เชลซี',
        time: 'เสาร์นี้ 19:30 น.',
        market: 'Over / Under 3.0',
        side1: 'Over 3.0',
        side2: 'Under 3.0',
        odds1: 1.98,
        odds2: 2.05,
        roi: 2.10,
        book1: 'UEA8',
        book2: 'Roobet',
        link1: 'https://www.uea8chokdee.com/en-th/register?refid=okgvitjq',
        link2: 'https://roobet.com/?ref=beluga1999'
      }
    ];

    global.__odds_cache = { ts: Date.now(), data: mock };
    return res.status(200).json(mock);
  } catch (err) {
    console.error('api/odds error', err);
    return res.status(500).json({ error: 'failed to fetch odds', message: String(err) });
  }
};
