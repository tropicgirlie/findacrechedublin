#!/usr/bin/env node
/**
 * Launch-readiness data audit for this static site.
 *
 * Run:
 *   node scripts/launch_audit.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadProviders() {
  const providersPath = path.join(__dirname, "..", "data", "providers.js");
  const code = fs.readFileSync(providersPath, "utf8");
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  const providers = ctx.window.PROVIDERS;
  if (!Array.isArray(providers)) throw new Error("window.PROVIDERS not found");
  return providers;
}

function isUsablePhone(phone) {
  if (!phone) return false;
  const lc = String(phone).toLowerCase().trim();
  return !lc.startsWith("via ") && lc !== "tusla register";
}

function hasDirectContact(p) {
  return !!(p.email || isUsablePhone(p.phone));
}

function isDirectoryListing(url) {
  if (!url) return false;
  const u = String(url).toLowerCase();
  return u.includes("tusla.ie/services/preschool-services/register-of-early-years-services") ||
    u.includes("childcare.ie/");
}

function hasContactPath(p) {
  return hasDirectContact(p) || !!p.website;
}

function groupByArea(providers) {
  const out = {};
  for (const p of providers) {
    const area = p.area || "Unknown";
    if (!out[area]) out[area] = [];
    out[area].push(p);
  }
  return out;
}

function summarize(list) {
  const opening = { open: 0, waitlist: 0, full: 0, unknown: 0 };
  let contactable = 0;
  let contactPath = 0;
  let directoryOnly = 0;
  let addressPrecise = 0;
  let unknownCoord = 0;
  let withEmail = 0;
  let withPhone = 0;
  let withWebsite = 0;

  for (const p of list) {
    const key = p.opening_status || "unknown";
    opening[key] = (opening[key] || 0) + 1;
    if (hasDirectContact(p)) contactable++;
    if (hasContactPath(p)) contactPath++;
    if (!hasDirectContact(p) && isDirectoryListing(p.website)) directoryOnly++;
    if (p.coord_source === "address") addressPrecise++;
    else if (p.coord_source === "town") unknownCoord++;
    if (p.email) withEmail++;
    if (isUsablePhone(p.phone)) withPhone++;
    if (p.website) withWebsite++;
  }

  return {
    total: list.length,
    opening,
    contactable,
    contactablePct: Math.round((contactable / Math.max(1, list.length)) * 100),
    contactPath,
    contactPathPct: Math.round((contactPath / Math.max(1, list.length)) * 100),
    directoryOnly,
    withEmail,
    withPhone,
    withWebsite,
    addressPrecise,
    townApprox: unknownCoord
  };
}

function printSummary(label, s) {
  console.log(`\n## ${label}`);
  console.log(`- total: ${s.total}`);
  console.log(
    `- opening: open=${s.opening.open || 0}, waitlist=${s.opening.waitlist || 0}, full=${s.opening.full || 0}, unknown=${s.opening.unknown || 0}`
  );
  console.log(
    `- direct contact: ${s.contactable}/${s.total} (${s.contactablePct}%)`
  );
  console.log(
    `- any contact path (direct or directory): ${s.contactPath}/${s.total} (${s.contactPathPct}%)`
  );
  console.log(`- directory-only: ${s.directoryOnly}`);
  console.log(
    `- contact fields: email=${s.withEmail}, phone=${s.withPhone}, website=${s.withWebsite}`
  );
  console.log(
    `- coordinates: address-level=${s.addressPrecise}, town-approx=${s.townApprox}`
  );
}

function main() {
  const providers = loadProviders();
  const areas = groupByArea(providers);
  const total = summarize(providers);

  console.log("Launch readiness data audit");
  printSummary("All areas", total);

  for (const area of Object.keys(areas).sort()) {
    printSummary(area, summarize(areas[area]));
  }
}

main();
