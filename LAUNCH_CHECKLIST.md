# Launch Checklist (This Week)

This project is now technically safe to launch as a static site, but launch quality depends on data verification discipline.

## 1) Must-do before going live

- [ ] Run `node scripts/launch_audit.js` and save the output.
- [ ] Confirm all pages load with no console errors.
- [ ] Manually click through:
  - [ ] map filters
  - [ ] provider compare cards
  - [ ] shortlist add/remove + export
  - [ ] "set home" flow
- [ ] Confirm the hosting domain + HTTPS.
- [ ] Confirm privacy copy reflects real behavior.

## 2) Data threshold for launch

Use this minimum bar before announcing publicly:

- [ ] At least 30 providers with direct contact method (email, callable phone, or website).
- [ ] At least 15 providers with verified `opening_status` (not `unknown`) across Lucan + Clondalkin + Kildare.
- [ ] At least top 20 closest providers with verified fee OR clear "estimate" expectation in notes.
- [ ] Spot-check 10 random providers for name/address correctness.

## 3) Daily verification sprint (30-45 min)

Each day this week:

1. Pick 10-15 providers from one area.
2. Verify status by phone/email/web form.
3. Update in `data/providers.js`:
   - `opening_status`
   - `last_verified` (today's date)
   - contact fields if newly found (`phone`, `email`, `website`)
4. Commit and redeploy.
5. Re-run `node scripts/launch_audit.js`.

## 4) Post-launch guardrails

- [ ] Add "last data refresh" note in hero or compare header.
- [ ] Re-verify high-demand providers every 7 days.
- [ ] Keep unknown statuses visible but never market them as confirmed availability.
- [ ] Keep weekly backups of `data/providers.js`.

## 5) One-line launch message

Use this wording publicly:

> "Live now: Lucan, Clondalkin and nearby Kildare childcare navigator. Provider records are from Tusla + ongoing parent verification. Availability and fees are clearly marked as verified vs estimated."
