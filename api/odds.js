module.exports = async (req, res) => {
  try {
    const mode = process.env.ODDS_MODE || 'mock';
    if (mode === 'poll' && process.env.ODDS_API_URL) {
      const upstream = await fetch(process.env.ODDS_API_URL, { headers: { Accept: 'application/json' } });
      if (!upstream.ok) {
        throw new Error(`Upstream odds fetch failed: ${upstream.status}`);
      }
      const payload = await upstream.json();
      return res.status(200).json(normalizeOdds(payload));
    }

    // Built-in mock data so the dashboard works without API keys.
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
        link1: 'https://www.pinnacle.com/en/?_gl=1*154o0tz*_gcl_au*MTI2Nzk4NDc3NC4xNzkxOTY2MjY0LjE4MjE2MjI1NjYuMTc5MjA0MTQyMi4xNzkyMDQxNjY1LjE4NjMzNjA1ODguMTc5MjA0MTM0MC4xNzkyMDQxNjY1*_ga*MzQxODU2NTA0LjE3OTE5NjYyNjc.*_ga_DXNRHBHDY9*czE3OTIwNDExOTckbzIkZzEkdDE3OTIwNDE4MDMkajQzJGwwJGgxODg0MjY3ODA1',
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
        link1: 'https://www.pinnacle.com/en/?_gl=1*154o0tz*_gcl_au*MTI2Nzk4NDc3NC4xNzkxOTY2MjY0LjE4MjE2MjI1NjYuMTc5MjA0MTQyMi4xNzkyMDQxNjY1LjE4NjMzNjA1ODguMTc5MjA0MTM0MC4xNzkyMDQxNjY1*_ga*MzQxODU2NTA0LjE3OTE5NjYyNjc.*_ga_DXNRHBHDY9*czE3OTIwNDExOTckbzIkZzEkdDE3OTIwNDE4MDMkajQzJGwwJGgxODg0MjY3ODA1',
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
        link1: 'https://www.pinnacle.com/en/?_gl=1*154o0tz*_gcl_au*MTI2Nzk4NDc3NC4xNzkxOTY2MjY0LjE4MjE2MjI1NjYuMTc5MjA0MTQyMi4xNzkyMDQxNjY1LjE4NjMzNjA1ODguMTc5MjA0MTM0MC4xNzkyMDQxNjY1*_ga*MzQxODU2NTA0LjE3OTE5NjYyNjc.*_ga_DXNRHBHDY9*czE3OTIwNDExOTckbzIkZzEkdDE3OTIwNDE4MDMkajQzJGwwJGgxODg0MjY3ODA1',
        link2: 'https://1xlite-34606.com/en'
      }
    ];

    return res.status(200).json(mock);
  } catch (err) {
    console.error('api/odds error', err);
    return res.status(500).json({ error: 'failed to load odds', message: String(err) });
  }
};

function normalizeOdds(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const entries = payload.data || payload.results || payload.markets || [];
  if (!Array.isArray(entries)) return [];

  return entries.map((item, i) => ({
    id: item.id || `match-${i + 1}`,
    league: item.league || item.sport || 'Unknown',
    teams: item.teams || item.home_team || item.name || 'Unknown matchup',
    time: item.time || item.commence_time || 'Live',
    market: item.market || item.bet_type || 'Live odds',
    side1: item.side1 || item.home || item.option_1 || 'Side 1',
    side2: item.side2 || item.away || item.option_2 || 'Side 2',
    odds1: Number(item.odds1 ?? item.home_odds ?? item.price_1 ?? 1.0),
    odds2: Number(item.odds2 ?? item.away_odds ?? item.price_2 ?? 1.0),
    roi: Number(item.roi ?? ((Math.min(Number(item.odds1 ?? 1), Number(item.odds2 ?? 1)) - 1) * 100) || 0),
    book1: item.book1 || 'Pinnacle',
    book2: item.book2 || '1xLite',
    link1: item.link1 || 'https://www.pinnacle.com/en/',
    link2: item.link2 || 'https://1xlite-34606.com/en'
  }));
}
