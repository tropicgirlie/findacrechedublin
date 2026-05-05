#!/usr/bin/env node
/**
 * Export top priority providers to verify this week.
 *
 * Output: CSV (stdout)
 * Usage:
 *   node scripts/export_priority_verification_list.js > priority.csv
 *   node scripts/export_priority_verification_list.js 60 > priority.csv
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const limit = Number(process.argv[2] || 60);
const HOME = { lat: 53.3548, lng: -6.4485 };

function loadProviders() {
  const code = fs.readFileSync(path.join(__dirname, "..", "data", "providers.js"), "utf8");
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return Array.isArray(ctx.window.PROVIDERS) ? ctx.window.PROVIDERS : [];
}

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

function usablePhone(phone) {
  if (!phone) return false;
  const lc = String(phone).toLowerCase();
  return !lc.startsWith("via ") && lc !== "tusla register";
}

function hasDirectContact(p) {
  return !!(p.email || usablePhone(p.phone) || p.website);
}

function csvCell(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, "\"\"")}"`;
  }
  return s;
}

function main() {
  const providers = loadProviders().map((p) => {
    const distKm = haversineKm(HOME, { lat: p.lat, lng: p.lng });
    const isUnknown = (p.opening_status || "unknown") === "unknown";
    const direct = hasDirectContact(p);
    const priority =
      (isUnknown ? 100 : 0) +
      (!direct ? 30 : 0) +
      (p.coord_source === "town" ? 5 : 0) +
      Math.max(0, 30 - Math.round(distKm));
    return { ...p, distKm, isUnknown, direct, priority };
  });

  providers.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.distKm - b.distKm;
  });

  const top = providers.slice(0, limit);
  const header = [
    "id",
    "name",
    "area",
    "town",
    "distance_km",
    "opening_status",
    "direct_contact",
    "phone",
    "email",
    "website",
    "last_verified"
  ];

  const rows = [header.join(",")];
  for (const p of top) {
    rows.push(
      [
        p.id,
        p.name,
        p.area || "",
        p.town || "",
        p.distKm.toFixed(2),
        p.opening_status || "unknown",
        p.direct ? "yes" : "no",
        p.phone || "",
        p.email || "",
        p.website || "",
        p.last_verified || ""
      ]
        .map(csvCell)
        .join(",")
    );
  }

  process.stdout.write(rows.join("\n") + "\n");
}

main();
