# Lucan & Kildare Childcare Navigator

A single-page tool for finding, tracking, and contacting childcare providers in Lucan and nearby Co. Kildare. Anchored at K78 EE02; every provider shows walking time, opening status, and one-click email/call buttons.

> **Status:** Personal-use tool. 21 providers covering Lucan + Celbridge, Leixlip, Naas, and other nearby Kildare towns. Data is research-compiled; see [data/README.md](data/README.md) for per-field provenance.

## What It Does

- **Home anchor (K78 EE02)**: every provider shows a walking-time pill (e.g. "12 min walk · 0.9 km") and an opening-status badge (✅ Open / ⏳ Waitlist / ❌ Full / ❓ Unknown). Filter the map and the cards by "Open spots only" and "Walking ≤ 20 min".
- **My Shortlist tracker**: one-click "Add to shortlist" on any provider, then track status (not contacted → email sent → called → replied → visited → confirmed/declined), last-contact date, next-follow-up reminder (highlights overdue in red), and free-text notes. Persisted in your browser via `localStorage`. Export as CSV for backup.
- **One-click contact**: 📧 Email button opens a pre-filled `mailto:` (initial enquiry or weekly follow-up depending on status), 📞 Call button opens `tel:` for the provider's number. Templates pull from the Settings panel (your name, child age, eircode, start window).
- **Interactive map** with 14 providers, colour-coded by waitlist risk, filterable by type, budget, Montessori, ECCE, opening status, and walking distance.
- **Provider comparison cards** with search, sort (closest first / open spots first / price / stability / waitlist / name), fees, hours, stability scores, and feature badges.
- **Live cost simulator** with NCS Universal, NCS Income-Assessed, and ECCE subsidies applied in the correct order, plus "what if" scenarios (work change, income drop, Sept 2026 policy shift).
- **Provider checklist** with constructive questions to ask when you visit, based on sector trends and each provider's profile.
- **Subsidy guide** in plain English: ECCE, NCS Universal, NCS Income-Assessed, Core Funding fee caps, plus ECCE birth-year eligibility table.

## Data

Provider data lives in [`data/providers.js`](data/providers.js). See [`data/README.md`](data/README.md) for the schema and the one-line edit pattern for marking an opening (`opening_status: "open"` + bump `last_verified`). 14 providers are mapped, one currently flagged with a confirmed opening.

## Colour Scheme

The palette draws from the Irish tricolour, reinterpreted as muted, warm tones:

| Irish Flag Colour | CSS Variable | Hex | Role |
|---|---|---|---|
| Green | `--sage-500` | `#5B8C6A` | Primary accent, buttons, links, stability bars |
| Green (dark) | `--sage-600` | `#4A7558` | Hover states, headings |
| Green (deep) | `--sage-700` | `#385A43` | Active/pressed states |
| White | `--cream` | `#FDFBF4` | Page background |
| White (warm) | `--cream-2` | `#F6F1E3` | Alternate section backgrounds |
| Orange | `--amber` | `#D9A441` | Warnings, medium-priority indicators |
| Orange (deep) | `--rust` | `#C15A3A` | High-priority indicators, gross-cost bars |

The sage greens, warm creams, and amber/rust accents create an unmistakably Irish feel without being literal or garish. The scheme can be modified by swapping the CSS custom properties in `:root` in `style.css`.

## Provider Checklist (formerly Stress Test)

The provider checklist section takes sector-wide pressures (977 service closures since 2019, 33% annual staff turnover in Dublin, 30% of managers reporting closure risk) and translates them into **constructive questions parents can ask** when visiting a provider.

Instead of labelling providers as "HIGH risk" or "LOW risk" (which could harm small, family-run businesses), each provider card shows:

- A stability score gauge (based on available data)
- A set of questions tailored to that provider's profile (e.g. "Ask about staff retention and ratios" for providers with known turnover concerns)
- A conversation starter to guide the visit

This approach helps parents make informed decisions without creating self-fulfilling prophecies about provider closures.

## Tech Stack

- Vanilla HTML/CSS/JS, no build step, no package.json
- [Leaflet](https://leafletjs.com/) with Carto Voyager tiles
- [Satoshi](https://www.fontshare.com/fonts/satoshi) from Fontshare
- Provider data in [`data/providers.js`](data/providers.js) (loaded via plain `<script>` so it works locally over `file://` and on Vercel without any dev server)
- Personal shortlist + settings stored in browser `localStorage` (no backend, no accounts)

## Run locally

Open `index.html` directly in a browser — no build step, no install. Or for HTTPS-strict APIs, serve with `python3 -m http.server 8000`.

## Deploy

This repo is a Vercel-ready static site. Push to GitHub, import the repo into Vercel, and it deploys with zero configuration. There is no `vercel.json` because there's nothing custom to configure.

## Scaling Beyond Lucan

To cover multiple Dublin areas (Clondalkin, Tallaght, Castleknock, etc.), the project would need:

1. A database (PostgreSQL, Supabase, or Firebase) to store provider records per area
2. An API layer to serve filtered/paginated data instead of the embedded `DATA` object
3. Area selection UI (dropdown or map-based region picker)
4. Updated map center/zoom per area

The current single-page architecture is intentionally simple for showcase purposes.

## Relationship to TakeHome.ie

This project was built as a companion to [TakeHome.ie](https://takehome.ie), which shows working parents (especially mothers) what they actually take home after childcare costs. The Navigator provides the supply-side data (where are the providers, what do they charge, what subsidies apply) that feeds into TakeHome's take-home pay calculation.

The long-term vision is to integrate the Navigator's provider data into TakeHome's calculator, so a user can pick a real provider and see their actual take-home pay in one step.

## Data Sources

- gov.ie National Childcare Scheme
- Tusla Early Years Register
- Early Childhood Ireland
- childcare.ie
- SIPTU Early Years Survey 2024
- RTE News, The Irish Times

Data gathered April 2026. Fees are estimates for comparison and should be confirmed directly with each provider.

## Licence

Built for parents in Lucan, Co. Dublin.
