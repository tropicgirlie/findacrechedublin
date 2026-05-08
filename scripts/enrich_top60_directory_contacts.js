#!/usr/bin/env node
/**
 * Add directory-listing contact links to top nearby providers
 * that currently have no direct contact method.
 *
 * Usage:
 *   node scripts/enrich_top60_directory_contacts.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const HOME = { lat: 53.3548, lng: -6.4485 };
const LIMIT = 60;
const TUSLA_LISTING_URL = "https://www.tusla.ie/services/preschool-services/parents-guardians/register-of-early-years-services/";

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function isUsablePhone(phone) {
  if (!phone) return false;
  const lc = String(phone).toLowerCase();
  return !lc.startsWith("via ") && lc !== "tusla register";
}

function hasDirectContact(p) {
  return !!(p.email || isUsablePhone(p.phone) || (p.website && !String(p.website).includes("tusla.ie/services/preschool-services/register-of-early-years-services")));
}

function loadProviders(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  if (!Array.isArray(ctx.window.PROVIDERS)) throw new Error("window.PROVIDERS not found");
  return ctx.window.PROVIDERS;
}

function main() {
  const providersPath = path.join(__dirname, "..", "data", "providers.js");
  const providers = loadProviders(providersPath);

  const nearby = providers
    .map((p) => ({ p, d: haversineKm(HOME, { lat: p.lat, lng: p.lng }) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, LIMIT)
    .map((x) => x.p);

  let updated = 0;
  for (const p of nearby) {
    if (hasDirectContact(p)) continue;
    if (!p.website) {
      p.website = TUSLA_LISTING_URL;
      const note = "Directory listing link added for contact/verification.";
      p.notes = p.notes ? `${p.notes} ${note}` : note;
      updated++;
    }
  }

  const header = `/* ============================================================
   Lucan & Kildare Childcare Navigator - provider dataset
   Updated by scripts/enrich_top60_directory_contacts.js on ${new Date().toISOString().slice(0, 10)}
   ============================================================ */

window.PROVIDERS = `;
  fs.writeFileSync(providersPath, header + JSON.stringify(providers, null, 2) + ";\n");
  console.log(`Updated ${updated} providers with directory listing links (top ${LIMIT} nearby).`);
}

main();
