# GiveFlpps

A Netlify-ready SteamGifts intelligence dashboard.

## What it does
- Pulls SteamGifts' documented JSON homepage feed (`?format=json`).
- Refreshes a persistent Netlify Blobs snapshot every 5 minutes.
- Normalizes active giveaways and deduplicates them.
- Calculates a transparent Heat Score from entry velocity, entry density, urgency, copies, comments, and points.
- Shows the top 100 active giveaways.
- Aggregates active giveaway counts by game/app ID.
- Provides search, filters, sorting, responsive UI, and a health endpoint.

## Deploy to Netlify
1. Push this folder to GitHub.
2. Import the repo in Netlify.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. No external database is required; Netlify Blobs is used for the cache.
6. Optional environment variable: `SG_MAX_PAGES` (default `4`).

## Endpoints
- `/api/giveaways`
- `/api/health`
- scheduled `refresh-data` function every 5 minutes

## Important
GiveFlpps is a discovery/analytics layer. It does not automatically enter giveaways or automate account actions.

SteamGifts provides an official JSON format intended for add-ons/scripts. Its documentation notes that JSON requests are subject to the site's rate limits and that the response includes giveaway fields such as app_id, copies, points, timestamps, and entry_count.

Before production launch, review SteamGifts' current Terms of Service and guidelines and keep the collector rate conservative.
