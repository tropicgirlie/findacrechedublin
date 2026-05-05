#!/usr/bin/env node
/**
 * Apply verification updates from CSV to data/providers.js.
 *
 * Usage:
 *   node scripts/apply_verification_updates.js updates.csv
 *
 * CSV columns (any subset except id):
 *   id,opening_status,last_verified,phone,email,website,hours,age_range,monthly_fee,weekly,notes
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/apply_verification_updates.js <updates.csv>");
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let i = 0;
  let cur = "";
  let row = [];
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === "\"" && next === "\"") {
        cur += "\"";
        i += 2;
        continue;
      }
      if (ch === "\"") {
        inQuotes = false;
        i++;
        continue;
      }
      cur += ch;
      i++;
      continue;
    }
    if (ch === "\"") {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(cur);
      cur = "";
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function loadProviders(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  if (!Array.isArray(ctx.window.PROVIDERS)) throw new Error("window.PROVIDERS not found");
  return ctx.window.PROVIDERS;
}

function normalizeStatus(v) {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return null;
  if (["open", "waitlist", "full", "unknown"].includes(s)) return s;
  return null;
}

function toNum(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function main() {
  const providersPath = path.join(__dirname, "..", "data", "providers.js");
  const providers = loadProviders(providersPath);
  const byId = new Map(providers.map((p) => [Number(p.id), p]));

  const csvText = fs.readFileSync(path.resolve(input), "utf8");
  const [headerRow, ...dataRows] = parseCsv(csvText);
  const headers = headerRow.map((h) => h.trim());
  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
  if (idx.id == null) {
    throw new Error("CSV must include id column");
  }

  let applied = 0;
  for (const row of dataRows) {
    const id = Number((row[idx.id] || "").trim());
    if (!Number.isFinite(id)) continue;
    const p = byId.get(id);
    if (!p) continue;

    const setString = (key) => {
      if (idx[key] == null) return;
      const val = (row[idx[key]] || "").trim();
      if (val) p[key] = val;
    };

    const setNumber = (key) => {
      if (idx[key] == null) return;
      const n = toNum((row[idx[key]] || "").trim());
      if (n != null) p[key] = n;
    };

    if (idx.opening_status != null) {
      const status = normalizeStatus(row[idx.opening_status]);
      if (status) p.opening_status = status;
    }
    if (idx.last_verified != null) {
      const lv = (row[idx.last_verified] || "").trim();
      if (lv) p.last_verified = lv;
    }
    setString("phone");
    setString("email");
    setString("website");
    setString("hours");
    setString("age_range");
    setNumber("monthly_fee");
    setNumber("weekly");
    setString("notes");
    applied++;
  }

  const banner = `/* ============================================================
   Lucan & Kildare Childcare Navigator - provider dataset
   Updated by scripts/apply_verification_updates.js on ${new Date().toISOString().slice(0, 10)}
   See data/README.md for schema and update process.
   ============================================================ */

window.PROVIDERS = `;

  fs.writeFileSync(providersPath, banner + JSON.stringify(providers, null, 2) + ";\n");
  console.log(`Applied updates to ${applied} rows in data/providers.js`);
}

main();
