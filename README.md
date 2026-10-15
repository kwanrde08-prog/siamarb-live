# SiamArb Live

This repo is configured for a Vercel preview and includes:
- `www/index.html` for the dashboard UI
- `api/odds.js` for live odds polling adapter (supports header-based API key)
- `api/stripe-create-session.js` for Stripe checkout session creation

Local preview:
```
npx vercel dev
```
Open the printed URL in your browser, usually http://localhost:3000

Environment variables (required for live provider):
- ODDS_MODE=poll
- ODDS_PROVIDER=pinnacle
- ODDS_API_URL=https://<provider-endpoint>/v1/odds
- ODDS_API_KEY=<your_api_key_here>
- ODDS_AUTH_HEADER=X-API-Key (optional, default X-API-Key)
- ODDS_CACHE_TTL_MS=5000 (optional)
- STRIPE_SECRET_KEY=sk_test_...
