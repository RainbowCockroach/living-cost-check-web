# living-cost-check-web

React + Vite + TypeScript client for the [living-cost-check-server](../living-cost-check-server). Deployed to GitHub Pages.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # → dist/
npm run typecheck
```

## Configure the API base URL

Hard-coded in `src/config.ts`:

```ts
export const API_BASE_URL = 'https://CHANGE-ME.example.com';
```

Replace the placeholder with your Cloudflare Tunnel hostname before deploying. Also make sure that hostname is listed in the server's `CORS_ORIGINS`, alongside this site's GitHub Pages URL.

## API key

Entered in the UI on first visit and saved to `localStorage` (`living-cost-check.apiKey`). All other screens are blocked until a key is present. A 401 from the server clears the stored key and bounces back to the entry screen.

## Routes (HashRouter)

- `#/key` — paste / replace the API key (verifies against `GET /me`)
- `#/new` — new expense (default after sign-in)
- `#/expenses` — list with date-range filter (defaults to current month); toggle **Edit** to reveal per-row delete buttons
- `#/reports` — spending-by-tag bar chart over a date range, with preset shortcuts (this month / last month / 3 months / YTD). Tail categories under 2% are folded into an "Other" row.

## Deploy

The workflow in `.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`. In the repo settings, set **Pages → Source** to **GitHub Actions**.

`vite.config.ts` sets `base: '/living-cost-check-web/'` to match the project page URL. Change it if you host under a different path.

## Out of scope (later phases)

- Recurring templates UI (`/templates` endpoints)
- Editing existing expenses (delete-only for now)
