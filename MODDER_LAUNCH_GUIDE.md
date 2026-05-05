# Modder Launch Guide

This project is designed to be forked for other towns and community maintainers.

## What this app is

- Static site (HTML/CSS/JS), no runtime backend required.
- Dataset-first architecture via `data/providers.js`.
- Parent workflow: shortlist, contact tracking, and local verification notes.

## What to localize for your town

- `HOME` in `app.js` (default anchor coordinates/eircode).
- Hero/title copy in `index.html`.
- Provider dataset in `data/providers.js`.

## Recommended launch workflow

1. Seed/curate providers.
2. Run:
   - `node scripts/enrich_top60_directory_contacts.js`
   - `node scripts/launch_audit.js`
3. Verify top 40-60 providers by call/email.
4. Apply verified updates:
   - `node scripts/apply_verification_updates.js updates.csv`
5. Track launch readiness:
   - `node scripts/launch_success_score.js`

## Data honesty policy (important)

- Never mark `opening_status` as open/waitlist/full without a real confirmation.
- Keep estimates labeled as unconfirmed until verified.
- Use directory-only labels when direct contacts are unavailable.

This keeps user trust high and prevents false expectations for parents.
