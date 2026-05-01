#!/usr/bin/env node
/**
 * Geocode every provider in data/providers.js using OpenStreetMap Nominatim.
 * Updates the file in place, replacing only the lat/lng values.
 *
 * Run: node scripts/geocode.js
 *
 * Nominatim usage policy: max 1 req/sec, real User-Agent header, attribution.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
const fs = require('fs');
const path = require('path');

const SLEEP_MS = 1100; // be polite (1.1s between requests)
const USER_AGENT = 'findacrechedublin/1.0 (https://github.com/tropicgirlie/findacrechedublin)';
// Reject Nominatim results that are further than this from the original
// (rough) coord. Nominatim defaults to a generic Dublin centroid when it can't
// find an Eircode, so keep results that move <= 4 km only.
const SANITY_RADIUS_KM = 4;
// Coordinates Nominatim returns when it can't find a specific Irish Eircode
// (the Dublin centroid). Reject these outright.
const NOMINATIM_FALLBACK = { lat: 53.3411, lng: -6.2545 };

function distKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(query) {
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      countrycodes: 'ie',
    });
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  const arr = await res.json();
  if (!arr.length) return null;
  return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
}

function buildQueries(p) {
  const queries = [];
  // Eircode + name first if eircode is the long form (e.g. K78 V295)
  const fullEircode = p.eircode && /^[A-Z]\d{1,2}\s+[A-Z0-9]+$/.test(p.eircode);
  if (fullEircode) queries.push(`${p.eircode}, Ireland`);
  // Address as written
  queries.push(`${p.address}, Ireland`);
  // Name + town fallback (last comma-separated chunk)
  const town = p.address.split(',').pop().trim();
  if (town) queries.push(`${p.name}, ${town}, Ireland`);
  return queries;
}

async function main() {
  const providersPath = path.join(__dirname, '..', 'data', 'providers.js');
  const originalCode = fs.readFileSync(providersPath, 'utf8');

  // Load providers by evaluating the file in a fake `window` context
  global.window = {};
  new Function(originalCode).call(global);
  const providers = global.window.PROVIDERS;
  if (!providers || !Array.isArray(providers)) {
    throw new Error('Could not load providers');
  }

  const updates = {};
  for (const p of providers) {
    const queries = buildQueries(p);
    let accepted = null;
    let acceptedQuery = null;
    let rejectedNotes = [];
    for (const q of queries) {
      const coords = await geocode(q);
      await sleep(SLEEP_MS);
      if (!coords) {
        rejectedNotes.push(`"${q}" -> no result`);
        continue;
      }
      // Reject Nominatim's Dublin-centroid fallback
      if (
        Math.abs(coords.lat - NOMINATIM_FALLBACK.lat) < 0.0005 &&
        Math.abs(coords.lng - NOMINATIM_FALLBACK.lng) < 0.0005
      ) {
        rejectedNotes.push(`"${q}" -> Dublin-centroid fallback, rejected`);
        continue;
      }
      // Reject results that are far from the original (which were at least
      // in roughly the right town).
      const dist = distKm(coords, { lat: p.lat, lng: p.lng });
      if (dist > SANITY_RADIUS_KM) {
        rejectedNotes.push(
          `"${q}" -> ${coords.lat.toFixed(4)},${coords.lng.toFixed(4)} is ${dist.toFixed(1)} km from original, rejected`
        );
        continue;
      }
      accepted = coords;
      acceptedQuery = q;
      break;
    }

    if (accepted) {
      updates[p.id] = { ...accepted, query: acceptedQuery };
      const moved = distKm(accepted, { lat: p.lat, lng: p.lng });
      console.log(
        `#${String(p.id).padStart(2)} ${p.name.padEnd(42)} ${p.lat.toFixed(4)},${p.lng.toFixed(4)} -> ${accepted.lat.toFixed(4)},${accepted.lng.toFixed(4)}  (moved ${moved.toFixed(2)} km)  via "${acceptedQuery}"`
      );
    } else {
      console.log(
        `#${String(p.id).padStart(2)} ${p.name.padEnd(42)} kept ${p.lat.toFixed(4)},${p.lng.toFixed(4)} (no good Nominatim hit)`
      );
      if (rejectedNotes.length) {
        for (const n of rejectedNotes) console.log(`     - ${n}`);
      }
    }
  }

  // Replace lat/lng in providers.js by anchoring on the id
  let newCode = originalCode;
  let replaced = 0;
  for (const p of providers) {
    const u = updates[p.id];
    if (!u) continue;
    const re = new RegExp(
      `(\\{\\s*id:\\s*${p.id}\\s*,[\\s\\S]*?)lat:\\s*-?\\d+\\.\\d+,\\s*lng:\\s*-?\\d+\\.\\d+`
    );
    if (!re.test(newCode)) {
      console.warn(`Could not find lat/lng pair for id ${p.id}`);
      continue;
    }
    newCode = newCode.replace(
      re,
      `$1lat:${u.lat.toFixed(4)}, lng:${u.lng.toFixed(4)}`
    );
    replaced++;
  }

  fs.writeFileSync(providersPath, newCode);
  console.log(`\nUpdated ${replaced}/${providers.length} entries in ${providersPath}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
