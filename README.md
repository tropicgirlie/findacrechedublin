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

## Heads-up on accuracy

**Walking-time estimates are approximate.** Each provider has a `lat` and `lng` in `data/providers.js`. Several were initially placed by eye against the eircode area rather than geocoded from the exact address, so a card might say "3 min walk" when the real walk is closer to 8. If precision matters, click the eircode link on the card to verify on Google Maps, and update the `lat`/`lng` in `data/providers.js` to match the exact pin.

**Fees are estimates, not chain-pulled.** See [data/README.md](data/README.md) for per-field provenance. The on-site "Where do prices come from?" callout above the compare table explains the same thing in plain English.

## Auto-filling crèches via Google Places API (optional, for forkers)

If you fork this for a town that doesn't have a curated list, you can use the Google Places API to discover crèches near a given coordinate and pre-fill `data/providers.js`. **This is paid above the free tier** (around $17 per 1,000 Place Details requests as of 2026, with a generous monthly free credit), so it's optional, not required.

The shape of the integration:

```js
// One-off script (Node.js), run locally to seed the dataset.
// Costs ~5 to 10 USD for a typical town's worth of providers.
const KEY = process.env.GOOGLE_PLACES_KEY;
const HOME = { lat: 53.3548, lng: -6.4485 }; // your town centre
const RADIUS_M = 5000;

// Step 1: Nearby Search for "creche" within 5 km
const nearby = await fetch(
  `https://places.googleapis.com/v1/places:searchNearby`,
  { method: "POST", headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location"
    },
    body: JSON.stringify({
      locationRestriction: {
        circle: { center: { latitude: HOME.lat, longitude: HOME.lng }, radius: RADIUS_M }
      },
      includedTypes: ["preschool", "child_care_agency"],
      maxResultCount: 20
    })
  }
).then(r => r.json());

// Step 2: For each place, transform into the providers.js schema
// and write data/providers.js.
const seeded = nearby.places.map((p, i) => ({
  id: i + 1,
  name: p.displayName.text,
  address: p.formattedAddress,
  lat: p.location.latitude,
  lng: p.location.longitude,
  // The rest (fees, waitlist, opening_status) start as estimates / unknown
  // and get filled in as you ring around.
  type: "Full Day Crèche",
  typeKey: "creche",
  monthly_fee: 1100,
  weekly: 254,
  post_universal: 683,
  ecce: true, core_funding: true,
  montessori: false, outdoor: true, meals: true,
  waitlist: "Medium", waitlist_months: 3,
  stability: 5, staff_concern: "Medium",
  chain: "Independent",
  opening_status: "unknown", last_verified: new Date().toISOString().slice(0,10),
  notes: "Auto-discovered via Google Places. Verify directly."
}));
```

Steps to run it:

1. Get a Google Places API key from the Google Cloud Console. Enable the **Places API (New)**. Restrict the key to your IP for safety.
2. `export GOOGLE_PLACES_KEY=your-key-here`
3. Save the script as `scripts/seed-from-places.js` and run with `node`.
4. Manually review the output before committing — Google sometimes returns hairdressers or coffee shops next to a crèche.

The site itself does **not** call Google APIs at runtime. This is a one-off seeding tool. The eircode + lat/lng you see on cards always come from `data/providers.js`, which is static and free to serve.

If you don't want to use Google Places, the cheaper alternatives are:
- **OpenStreetMap Nominatim** (free) for geocoding addresses you already have, but no nearby-search by category.
- **Tusla Early Years Register** (free, official) — manually copy the relevant rows for your area.
- **childcare.ie county directories** — manual copy as a starting point.

## Adapting for your town

This site is built to be forked. To make it work for, say, Naas or Drogheda or Tralee:

| What to change | Where | Why |
|---|---|---|
| `HOME` constant | [app.js](app.js) near the top | Default eircode + lat/lng anchor for new visitors. Each visitor can override this in Settings, but the default should match the town. |
| `DATA.metadata.center` | [app.js](app.js) (just below `HOME`) | The map centres here on first load. |
| Map zoom in `buildMap()` | [app.js](app.js) | Currently 11 to fit Lucan + Kildare. Use 12 or 13 for a single town. |
| Provider list | [data/providers.js](data/providers.js) | Replace the 21 entries. Schema: see [data/README.md](data/README.md). |
| Title, hero, banner | [index.html](index.html) | The "Lucan & Kildare" copy in the `<title>`, hero, home banner, and resource cards. |
| README description | [README.md](README.md) | Mention your area. |

That's it. No build step. No backend. No env vars. Open `index.html` in a browser and verify, then push to your own Vercel project.

What you do **not** need to change:
- Email templates (already generic).
- Cost simulator (NCS, ECCE, Core Funding are national Irish schemes).
- Shortlist tracker, subsidy guide, stability checklist (all generic).

Each visitor types in their own name, phone, eircode, and coordinates via the Settings panel; those settings are stored in their own browser, never in your code.

## License

MIT — see [LICENSE](LICENSE). Use it, fork it, change it, ship your own version. A credit link back to the original is appreciated but not required.

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
