const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const matches = [
  {
    id: 'epl-liv-che',
    league: 'EPL',
    market: '1X2',
    home: 'Liverpool',
    away: 'Chelsea',
    teams: 'Liverpool vs Chelsea',
    book1: '1xLite',
    book2: 'Pinnacle',
    odds1: 1.82,
    odds2: 4.10,
    roi: 3.1,
    lastUpdated: Date.now()
  },
  {
    id: 'epl-ars-mci',
    league: 'EPL',
    market: '1X2',
    home: 'Arsenal',
    away: 'Manchester City',
    teams: 'Arsenal vs Manchester City',
    book1: '1xLite',
    book2: 'Pinnacle',
    odds1: 2.64,
    odds2: 2.52,
    roi: 2.7,
    lastUpdated: Date.now()
  },
  {
    id: 'laliga-rma-bar',
    league: 'LaLiga',
    market: '1X2',
    home: 'Real Madrid',
    away: 'Barcelona',
    teams: 'Real Madrid vs Barcelona',
    book1: '1xLite',
    book2: 'Pinnacle',
    odds1: 1.95,
    odds2: 3.35,
    roi: 2.9,
    lastUpdated: Date.now()
  },
  {
    id: 'laliga-atm-val',
    league: 'LaLiga',
    market: '1X2',
    home: 'Atletico Madrid',
    away: 'Valencia',
    teams: 'Atletico Madrid vs Valencia',
    book1: '1xLite',
    book2: 'Pinnacle',
    odds1: 1.68,
    odds2: 5.00,
    roi: 2.5,
    lastUpdated: Date.now()
  },
  {
    id: 'ucl-psg-bar',
    league: 'UCL',
    market: '1X2',
    home: 'PSG',
    away: 'Barcelona',
    teams: 'PSG vs Barcelona',
    book1: '1xLite',
    book2: 'Pinnacle',
    odds1: 2.08,
    odds2: 3.15,
    roi: 2.8,
    lastUpdated: Date.now()
  },
  {
    id: 'ucl-bay-int',
    league: 'UCL',
    market: '1X2',
    home: 'Bayern Munich',
    away: 'Inter Milan',
    teams: 'Bayern Munich vs Inter Milan',
    book1: '1xLite',
    book2: 'Pinnacle',
    odds1: 1.96,
    odds2: 3.80,
    roi: 2.6,
    lastUpdated: Date.now()
  },
  {
    id: 'efl-new-che',
    league: 'EFL Cup',
    market: '1X2',
    home: 'Newcastle United',
    away: 'Chelsea',
    teams: 'Newcastle United vs Chelsea',
    book1: '1xLite',
    book2: 'Pinnacle',
    odds1: 2.50,
    odds2: 2.72,
    roi: 2.4,
    lastUpdated: Date.now()
  },
  {
    id: 'efl-liv-ava',
    league: 'EFL Cup',
    market: '1X2',
    home: 'Liverpool',
    away: 'Aston Villa',
    teams: 'Liverpool vs Aston Villa',
    book1: '1xLite',
    book2: 'Pinnacle',
    odds1: 1.52,
    odds2: 6.10,
    roi: 2.2,
    lastUpdated: Date.now()
  }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomWalk(value) {
  const bump = (Math.random() - 0.5) * 0.14;
  return Number(clamp(value + bump, 1.05, 7.5).toFixed(2));
}

function sendSnapshot(ws) {
  matches.forEach((match) => {
    ws.send(JSON.stringify({
      id: match.id,
      odds1: match.odds1,
      odds2: match.odds2,
      ts: Date.now(),
      league: match.league,
      home: match.home,
      away: match.away,
      market: match.market,
      book1: match.book1,
      book2: match.book2,
      teams: match.teams
    }));
  });
}

const server = http.createServer((req, res) => {
  let reqPath = req.url === '/' ? '/index.html' : req.url;
  reqPath = reqPath.split('?')[0];
  const filePath = path.join(__dirname, 'www', reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml'
    };

    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  sendSnapshot(ws);

  const timer = setInterval(() => {
    matches.forEach((match) => {
      match.odds1 = randomWalk(match.odds1);
      match.odds2 = randomWalk(match.odds2);
      match.lastUpdated = Date.now();
      ws.send(JSON.stringify({
        id: match.id,
        odds1: match.odds1,
        odds2: match.odds2,
        ts: match.lastUpdated,
        league: match.league,
        home: match.home,
        away: match.away,
        market: match.market,
        book1: match.book1,
        book2: match.book2,
        teams: match.teams
      }));
    });
  }, 2000);

  ws.on('close', () => clearInterval(timer));
});

server.listen(8080, () => {
  console.log('Demo realtime odds server running on ws://localhost:8080');
});
