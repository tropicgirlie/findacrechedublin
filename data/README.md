# Provider data

All 14 providers live in [`providers.js`](providers.js). It's a plain JavaScript file that sets `window.PROVIDERS` to a JSON-shaped array, so the site loads it via a regular `<script>` tag (works locally over `file://` and on Vercel without any build step).

## How to mark an opening

The two fields you'll touch most often are **`opening_status`** and **`last_verified`**.

```js
opening_status: "open",          // ← change this
last_verified:  "2026-04-29",    // ← bump to today's date
```

Allowed values for `opening_status`:

| Value       | Badge on the card         | Meaning                                                      |
|-------------|---------------------------|--------------------------------------------------------------|
| `"open"`    | ✅ Open spot              | They confirmed there's a place available now.                |
| `"waitlist"`| ⏳ Waitlist               | They confirmed a wait, you're on the list.                   |
| `"full"`    | ❌ Full                   | They confirmed no places and no waitlist.                    |
| `"unknown"` | ❓ Status unknown          | Default. We haven't checked or they haven't replied.         |

`last_verified` is the date in `YYYY-MM-DD` of the last time you confirmed the status. Bump it whenever you re-check.

The "Show only open spots" filter on the cards section reads `opening_status === "open"`. If you set it to `"open"` for a provider, they show up immediately on next page load.

## Current openings

| Provider | Status | Last verified | Notes |
|---|---|---|---|
| Little Harvard Kilcarbery (Clondalkin) | **open** | 2026-04-29 | Confirmed opening. Eircode D22 X0F0. Phone (01) 274 1056. Outside walking distance from K78 EE02 — paid drop-off needed. |
| All other providers | unknown | 2026-04-29 | To be confirmed by direct enquiry. |

## Field reference

| Field | Type | Example | Notes |
|---|---|---|---|
| `id` | number | `5` | Unique. Used as the localStorage key for the shortlist tracker. |
| `name` | string | `"Little Harvard Kilcarbery (Clondalkin)"` | |
| `type` | string | `"Full Day Crèche & Montessori"` | Free text shown on the card. |
| `typeKey` | string | `"creche"` | One of `"creche" \| "montessori" \| "childminder" \| "playschool"`. Used by the type filter. |
| `address` | string | `"Kilcarbery Grange, Dublin 22"` | |
| `eircode` | string | `"D22 X0F0"` | Used for display only. Distance comes from `lat`/`lng`. |
| `lat`, `lng` | number | `53.3226`, `-6.4285` | Used for the map and for walking-distance estimates from K78 EE02. |
| `phone` | string | `"(01) 274 1056"` | If the value starts with `"via "` or is `"Tusla register"`, the Call button is hidden (no usable number). |
| `email` | string | `"info@littleharvard.ie"` | If empty, the Email button is hidden. |
| `website` | string | `"https://www.littleharvard.ie"` | Empty string means no public site. |
| `hours` | string | `"7:00–18:30 Mon–Fri"` | |
| `age_range` | string | `"6 months – 12 yrs"` | |
| `monthly_fee` | number | `1350` | Gross fee in EUR/month before subsidies. |
| `post_universal` | number | `932` | Fee after NCS Universal subsidy. |
| `weekly` | number | `295` | Weekly fee for sessional providers. |
| `ecce` | boolean | `true` | Provider is in the ECCE scheme. |
| `core_funding` | boolean | `true` | Provider is in Core Funding. |
| `montessori` | boolean | `true` | |
| `outdoor` | boolean | `true` | |
| `meals` | boolean | `true` | |
| `waitlist` | string | `"Very High"` | One of `"Low" \| "Medium" \| "High" \| "Very High"`. Sector-level estimate; `opening_status` is the live truth. |
| `waitlist_months` | number | `9` | Estimated wait in months. |
| `stability` | number | `7` | 0–10 score for the checklist gauge. |
| `staff_concern` | string | `"Medium"` | One of `"Low" \| "Medium" \| "High"`. |
| `chain` | string | `"Little Harvard (20+ locations)"` | |
| `sessional` | boolean | `true` | Set on Montessori-only providers; affects the cost simulator. |
| `opening_status` | string | `"open"` | See table above. **The most important field for finding a place.** |
| `last_verified` | string | `"2026-04-29"` | `YYYY-MM-DD`. Bump whenever you re-check. |
| `notes` | string | `"Confirmed opening as of 2026-04-29 — contact promptly."` | Free text shown on the card. |

## How to add a new provider

1. Add a new object to the array in `providers.js`.
2. Pick the next available `id` (currently 15).
3. Set every field above. Use `"unknown"` for `opening_status` until you've confirmed.
4. Save the file. Reload the site. The new provider appears on the map and in the cards.

If you don't know `lat`/`lng`, paste the eircode into Google Maps, right-click the pin, copy the decimal coordinates.
