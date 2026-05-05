#!/usr/bin/env node
/**
 * Launch success score (0-100) for practical readiness.
 *
 * Score weights:
 * - 40% opening status coverage (non-unknown)
 * - 30% direct contact coverage
 * - 20% recency (verified in last 14 days)
 * - 10% coordinate precision (address-level)
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadProviders() {
  const code = fs.readFileSync(path.join(__dirname, "..", "data", "providers.js"), "utf8");
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return Array.isArray(ctx.window.PROVIDERS) ? ctx.window.PROVIDERS : [];
}

function isUsablePhone(phone) {
  if (!phone) return false;
  const lc = String(phone).toLowerCase();
  return !lc.startsWith("via ") && lc !== "tusla register";
}

function isDirectoryUrl(url) {
  if (!url) return false;
  const u = String(url).toLowerCase();
  return u.includes("tusla.ie/services/preschool-services/register-of-early-years-services") || u.includes("childcare.ie/");
}

function hasDirectContact(p) {
  return !!(p.email || isUsablePhone(p.phone) || (p.website && !isDirectoryUrl(p.website)));
}

function daysAgo(iso) {
  if (!iso) return Infinity;
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return Infinity;
  const now = new Date();
  const ms = now.getTime() - d.getTime();
  return ms / (1000 * 60 * 60 * 24);
}

function pct(n, d) {
  return d ? n / d : 0;
}

function scoreArea(list) {
  const total = list.length;
  const openKnown = list.filter((p) => (p.opening_status || "unknown") !== "unknown").length;
  const direct = list.filter(hasDirectContact).length;
  const fresh = list.filter((p) => daysAgo(p.last_verified) <= 14).length;
  const precise = list.filter((p) => p.coord_source === "address").length;

  const openingPct = pct(openKnown, total);
  const directPct = pct(direct, total);
  const freshPct = pct(fresh, total);
  const precisePct = pct(precise, total);

  const score =
    openingPct * 40 +
    directPct * 30 +
    freshPct * 20 +
    precisePct * 10;

  return {
    total,
    openingKnown: openKnown,
    direct,
    fresh14d: fresh,
    precise,
    score: Math.round(score * 10) / 10
  };
}

function main() {
  const providers = loadProviders();
  const byArea = providers.reduce((acc, p) => {
    const a = p.area || "Unknown";
    (acc[a] ||= []).push(p);
    return acc;
  }, {});

  const all = scoreArea(providers);
  console.log(`Launch Success Score: ${all.score}/100`);
  console.log(`- providers: ${all.total}`);
  console.log(`- opening known: ${all.openingKnown}/${all.total}`);
  console.log(`- direct contact: ${all.direct}/${all.total}`);
  console.log(`- verified <=14d: ${all.fresh14d}/${all.total}`);
  console.log(`- address-level coords: ${all.precise}/${all.total}`);

  for (const area of Object.keys(byArea).sort()) {
    const s = scoreArea(byArea[area]);
    console.log(`\n[${area}] ${s.score}/100`);
    console.log(`- opening known: ${s.openingKnown}/${s.total}`);
    console.log(`- direct contact: ${s.direct}/${s.total}`);
    console.log(`- verified <=14d: ${s.fresh14d}/${s.total}`);
    console.log(`- address-level coords: ${s.precise}/${s.total}`);
  }
}

main();
