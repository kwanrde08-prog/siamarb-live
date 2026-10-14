# SiamArb Live - Live Odds & Stripe Serverless

This branch adds serverless API endpoints and frontend hooks to turn the static landing page into a small live dashboard.

Files added:
- api/odds.js - Serverless endpoint that returns odds. If `ODDS_API_URL` is set, it proxies that URL. Otherwise it returns a mock dataset for development.
- api/stripe-create-session.js - Serverless endpoint to create a Stripe Checkout session. Requires `STRIPE_SECRET_KEY` to be set in Vercel environment variables.

Environment variables
- ODDS_API_URL (optional) - an upstream odds provider URL that returns JSON in a frontend-friendly format. If omitted, the endpoint serves mocked data.
- STRIPE_SECRET_KEY (required for real Stripe Checkout) - your Stripe secret key.

Deploying on Vercel
1. Push the branch (already created: feature/live-odds-ui).
2. In your Vercel project settings, set the environment variables (STRIPE_SECRET_KEY, optionally ODDS_API_URL).
3. Deploy. The static site is in `www/` and serverless functions are in `api/`.

Local testing
- Install Vercel CLI and run `vercel dev` to test serverless endpoints locally.

Security & production
- Do NOT commit secrets to the repository.
- Use Stripe Checkout (server-created session) to avoid handling card data on your servers.

