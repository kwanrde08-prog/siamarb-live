# SiamArb Live

This repo is configured for a Vercel preview and includes:
- `www/index.html` for the dashboard UI
- `api/odds.js` for live odds mock/polling API
- `api/stripe-create-session.js` for Stripe checkout session creation

Local preview:
```
npx vercel dev
```
Open the printed URL in your browser, usually http://localhost:3000

Environment variables (optional for real provider):
- ODDS_MODE=mock
- ODDS_API_URL=https://your-odds-provider.example
- STRIPE_SECRET_KEY=sk_test_...
