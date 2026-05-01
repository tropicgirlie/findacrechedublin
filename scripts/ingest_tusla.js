#!/usr/bin/env node
/**
 * Ingest Tusla Early Years Register entries into data/providers.js.
 *
 * Three sources:
 *   1. inline LUCAN[]  - 35 services (from the user's verbatim table)
 *   2. inline CLONDALKIN[] - 32 services (same)
 *   3. parsed from /tmp/kildare_tusla.txt (pdftotext -layout output of the
 *      official Tusla Kildare PDF, March 2026), filtered to NEARBY towns
 *      that are commute-relevant for K78 V295 in Lucan
 *
 * Each entry is normalised to the provider schema documented in
 * data/README.md. Where the source doesn't give a value, we use a
 * sensible default flagged in `notes`.
 *
 * Coordinates are NOT address-level here. Each town is geocoded once via
 * OSM Nominatim, and entries in that town receive the town centroid +/-
 * a small deterministic jitter so they don't pile on the map. The user
 * can refine specific entries later (the eircode override / map-click
 * UX is already in place).
 *
 * Run: node scripts/ingest_tusla.js
 *      Writes data/providers.js in place.
 */
const fs = require('fs');
const path = require('path');

const SLEEP_MS = 1100;
const USER_AGENT = 'findacrechedublin/1.0 (https://github.com/tropicgirlie/findacrechedublin)';
const TODAY = new Date().toISOString().slice(0, 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================
// Source 1 + 2: user-provided Lucan + Clondalkin tables
// ============================================================
const LUCAN = [
  ["Busy Kids Creche", "Hansford, Newcastle Road, Lucan", "Full Day", 104],
  ["Clondalkin Lucan Centre (CLC)", "St. Loman's Road, Lucan", "Drop-In", 8],
  ["Cocoon Childcare – Lucan", "1 Rosse Court Terrace Block 5, Balgaddy, Lucan", "Full Day, Part Time, Sessional", 104],
  ["Enchanted Abbey Montessori School", "4 Weston Lawn, Lucan", "Sessional", 16],
  ["First Steps Academy", "The Poplars, St. Edmunds Avenue, Lucan", "Full Day", 132],
  ["Giraffe Childcare – Shackleton", "Unit 1, Shackleton Mill, Shackleton Vale, Lucan", "Full Day, Part Time, Sessional", 130],
  ["Giraffe Childcare Adamstown", "Adamstown Avenue, Castlegate, Lucan", "Full Day, Part Time, Sessional", 78],
  ["Giraffe Childcare Griffeen", "Griffeen Avenue, Lucan", "Full Day", 78],
  ["Giraffe Childcare Lucan", "Ballyowen Lane, Lucan", "Full Day, Part Time, Sessional", 108],
  ["Griffeen Valley Childcare", "20A Moy Glas Wood, Lucan", "Sessional", 14],
  ["Hansel & Gretel Playschool", "The Bush Centre, Balgaddy, Lucan", "Part Time, Sessional", 22],
  ["Happy Tots", "20 Foxborough Lawn, Lucan", "Full Day, Part Time, Sessional", 41],
  ["K&L Naíonra & Afterschool Club Ltd", "Lucan Sports Community Centre, Griffeen Valley Park, Lucan", "Sessional", 33],
  ["Keane Minds Montessori School", "Earlsfort Residents Centre, Earlsfort Road, Lucan", "Sessional", 22],
  ["Kidsbrook Creche", "94 Colthurst Crescent, Lucan", "Full Day, Part Time", 19],
  ["Learning For Life", "DTTLB Campus, Esker Hill, Lucan", "Full Day, Part Time, Sessional", 70],
  ["Little Folk Preschool", "3 Hermitage Gardens, Lucan", "Sessional", 18],
  ["Lucan Child Nursery & Montessori", "13 Westbrook Park, Lucan", "Full Day, Part Time, Sessional", 27],
  ["Montessori Matters", "108 Esker Manor, Lucan", "Full Day, Part Time, Sessional", 53],
  ["Montessori Matters Ltd", "23 Griffeen Glen Vale, Lucan", "Sessional", 21],
  ["Naíonra Eiscir", "Esker House Annexe, Esker Road, Lucan", "Sessional", 27],
  ["Naíonra Matters", "Gael Scoil Eiscir Riada, Griffeen Road, Lucan", "Sessional", 22],
  ["Nexus ASD Preschool", "Cannon Despard Centre, Chapel Hill, Lucan", "Part Time", 24],
  ["Nexus Preschool", "72 Rokeby Park, Lucan", "Part Time", 20],
  ["Pathways Childcare Lucan", "2 Liffey Valley Drive, Lucan", "Sessional", 47],
  ["Precious Minds Créche & Montessori School", "1 Griffeen Glen Drive, Lucan", "Full Day, Part Time, Sessional", 34],
  ["Sarah's Little Sunflowers Pre-school", "14 Johnsbridge Close, Lucan", "Sessional", 16],
  ["SmallWorld Early Education", "Muintir na Tire, Distillery Lane, Lucan", "Sessional", 44],
  ["Spraoi Montessori", "1 The Close, Grange Manor, Lucan", "Sessional", 10],
  ["StartBright St Finians", "22 St. Finian's Green, Lucan", "Part Time", 34],
  ["Startbright Balgaddy", "Meile an Rí Road, Balgaddy, Lucan", "Part Time, Sessional", 38],
  ["Sunflowers Childcare", "Ballyowen Lane, Lucan", "Full Day, Part Time, Sessional", 56],
  ["The Village Montessori", "Canon Despard Centre, Chapel Hill, Lucan", "Part Time, Sessional", 88],
  ["The Wombles Pre School Limited", "Scoil Mhuire Primary School, Arlie Heights, Doddsborough, Lucan", "Sessional", 22],
  ["Tots of Fun", "45 Colthurst Crescent, Lucan", "Sessional", 22]
];

const CLONDALKIN = [
  ["Alpine Kidz", "Unit 1, Green Isle Business Park, Clondalkin, D22", "Part Time", 31],
  ["Bambi's Childcare Company Ltd.", "U3 Greenpark Shopping Centre, Clondalkin, D22", "Part Time, Sessional", 22],
  ["Bright Sparks Montessori", "Scoil Áine Primary School, New Road, Clondalkin, D22", "Sessional", 22],
  ["Bright Sparks Montessori & Daycare", "18a St. Anthony's Avenue, Clondalkin, D22", "Full Day, Part Time, Sessional", 40],
  ["Castle Kids Montessori", "3 Castle Crescent, Clondalkin, D22", "Sessional", 22],
  ["Deansrath Family Centre", "Deansrath Health Centre, St. Cuthbert's Road, Clondalkin, D22", "Sessional", 25],
  ["Deansrath Family Centre Play and Development", "42 Kilcronin Court, St Cuthberts Road, Clondalkin, D22", "Part Time", 13],
  ["First Steps", "Rowlagh Health Centre, Rowlagh, Clondalkin, D22", "Full Day, Part Time, Sessional", 48],
  ["Fonthill Lodge Childcare", "Unit 3, The Local Node Building, Parkleigh Drive, Seven Mills, Clonburris, D22", "Full Day, Part Time, Sessional", 106],
  ["Footprints Early Years LTD", "Saint Finians Community Hall, Main Street Upper, D22", "Part Time, Sessional", 22],
  ["Giraffe Childcare Liffey Valley", "Liffey Valley Office Campus, Liffey Valley, Clondalkin, D22", "Full Day, Part Time, Sessional", 96],
  ["Honeybears Community Childcare", "Quarryvale Resource Centre, Shancastle Avenue, Clondalkin, D22", "Full Day, Part Time, Sessional", 12],
  ["Little Gems Childcare", "Suaimhneas, Commons Road, Clondalkin, D22", "Full Day, Part Time, Sessional", 60],
  ["Meadows Preschool", "17 Monksfield Meadows, Clondalkin, D22", "Sessional", 0],
  ["Mrs Giggles (Bawnogue)", "Bawnogue Community Centre, Clondalkin, D22", "Sessional", 22],
  ["Mrs Giggles (Boot Road)", "Rear of 29 Boot Road, Clondalkin, D22", "Sessional", 40],
  ["Naíonra Chrónáin", "Áras Chrónáin, Bóthar an Úlloird, Cluain Dolcáin, D22", "Sessional", 33],
  ["Naíonra Montessori Cluain Dolcain", "St. Joseph's Pipe Band Hall, Old Nangor Road, Clondalkin, D22", "Sessional", 22],
  ["Oakview Village Clondalkin", "Clondalkin Civic Centre, South Dublin Co. Council, Clondalkin, D22", "Full Day", 53],
  ["Rainbow Magic Pre-school", "St. Jude's, 3 Old Nangor Road, Clondalkin, D22", "Sessional", 22],
  ["Ready Steady Play", "Liffey Valley Shopping Centre, Clondalkin, D22", "Drop-In", 20],
  ["Ronanstown Community Childcare Centre", "Neilstown Road, Clondalkin, D22", "Full Day, Part Time, Sessional", 48],
  ["Ronanstown Women's Community Development Project Creche", "Ronanstown Village Court, Neilstown Road, Clondalkin, D22", "Part Time", 25],
  ["Rowlagh Parish Playgroup", "Rowlagh Community Centre, Neilstown Road, Clondalkin, D22", "Sessional", 24],
  ["Rowlagh Women's Group Preschool", "Áras Rualach, Neilstown Road, Clondalkin, D22", "Part Time, Sessional", 22],
  ["StartBright Bawnogue", "ACE Enterprise Park, Bawnogue Road, Clondalkin, D22", "Full Day, Part Time, Sessional", 51],
  ["StartBright Deansrath", "St. Cuthberts Road, Deansrath, Clondalkin, D22", "Part Time, Sessional", 40],
  ["StartBright St. Ronan's", "St. Ronan's Resource Centre, Deansrath, Clondalkin, D22", "Sessional", 22],
  ["Sticky Fingers Ltd", "Roslyn, Hazelhatch Road, Newcastle, D22", "Full Day, Part Time, Sessional", 35],
  ["Superstars Early Learning and Care", "20 Cooleven Green, Clondalkin, D22", "Sessional", 0],
  ["The Village Day Care & Montessori School Ltd", "64 Laurel Park, Clondalkin, D22", "Full Day, Part Time, Sessional", 76],
  ["footprints montessori & afterschool", "Clondalkin Sports & Leisure Centre, Nangor Road, Clondalkin, D22", "Sessional", 53]
];

// ============================================================
// Source 3: nearby Kildare from /tmp/kildare_tusla.txt
//
// We only ingest entries whose Town column matches the nearby-towns
// allow-list. That keeps the dataset focused on commute-relevant
// providers for K78 V295 (Lucan). Distant Kildare entries (Athy,
// Ballymore Eustace, Castledermot) are skipped for now and can be
// added in a phase-2 commit.
// ============================================================
const NEARBY_KILDARE = new Set([
  "Maynooth", "Celbridge", "Leixlip", "Kilcock", "Sallins",
  "Naas", "Newbridge", "Clane", "Straffan", "Confey", "Caragh",
  "Allenwood", "Kill", "Johnstown", "Kilteel", "Castledillon",
  "Two-Mile-House", "Two Mile House", "Carbury", "Robertstown",
  "Prosperous", "Rathangan", "Kildare Town", "Kildare",
  "Monasterevin", "Lullymore", "Kilmeague"
]);

// Service-type strings → (typeKey, sessional)
function classify(serviceType, name){
  const s = String(serviceType || "").toLowerCase();
  const n = String(name || "").toLowerCase();
  let typeKey = "creche";
  let sessional = false;
  let typeLabel = "Full Day Crèche";

  // Sessional-only providers
  if (/sessional/.test(s) && !/full\s*day/.test(s) && !/part\s*time/.test(s)){
    if (/montessori|naíonra/.test(n)){
      typeKey = "montessori";
      typeLabel = "Sessional Montessori / Preschool";
    } else {
      typeKey = "playschool";
      typeLabel = "Sessional Preschool";
    }
    sessional = true;
  } else if (/drop[\s-]*in/.test(s)){
    typeKey = "playschool";
    typeLabel = "Drop-In Childcare";
  } else if (/part\s*time/.test(s) && !/full\s*day/.test(s)){
    typeKey = "playschool";
    typeLabel = "Part-time Preschool";
  } else if (/full\s*day/.test(s)){
    typeKey = "creche";
    typeLabel = /montessori/.test(n) ? "Full Day Crèche & Montessori" : "Full Day Crèche";
  }
  // Naíonra is Irish-medium preschool
  if (/naíonra/.test(n) && typeKey !== "creche") typeKey = "montessori";

  return { typeKey, typeLabel, sessional, montessoriFlag: /montessori|naíonra/.test(n) };
}

// Build sensible defaults for fees/eligibility based on type and name.
// Chains use chain-standard rates; small independents use Core Funding
// cap range estimates. Sessional providers reflect ECCE capitation.
function defaults({ typeKey, sessional, name }){
  const isChain = /^(giraffe|cocoon|little harvard|tigers|startbright|happy tots(?!\s+playschool))/i.test(name);
  if (sessional){
    return {
      monthly_fee: 320, post_universal: 320, weekly: 80,
      ecce: true, core_funding: true,
      waitlist: "Medium", waitlist_months: 3, stability: 5
    };
  }
  if (typeKey === "playschool" || typeKey === "montessori"){
    return {
      monthly_fee: 480, post_universal: 480, weekly: 120,
      ecce: true, core_funding: true,
      waitlist: "Medium", waitlist_months: 3, stability: 5
    };
  }
  // Full Day
  return {
    monthly_fee: isChain ? 1150 : 1050,
    post_universal: isChain ? 732 : 632,
    weekly: isChain ? 265 : 240,
    ecce: true, core_funding: true,
    waitlist: isChain ? "High" : "Medium",
    waitlist_months: isChain ? 6 : 3,
    stability: isChain ? 8 : 5
  };
}

// Detect chain from name to tag the chain field
function chainFromName(name){
  const n = name.toLowerCase();
  if (/^giraffe/.test(n)) return "Giraffe Childcare (national chain)";
  if (/^cocoon/.test(n)) return "Cocoon Childcare (chain)";
  if (/^little harvard/.test(n)) return "Little Harvard (chain)";
  if (/^tigers/.test(n)) return "Tigers Childcare (chain)";
  if (/^startbright/.test(n) || /^start\s*bright/.test(n)) return "StartBright (chain)";
  if (/^happy tots/.test(n)) return "Independent";
  if (/^bright sparks/.test(n)) return "Bright Sparks (small chain)";
  if (/^mrs giggles/.test(n)) return "Mrs Giggles (small chain)";
  if (/^shining stars/.test(n)) return "Shining Stars (small chain)";
  if (/^montessori matters/.test(n)) return "Montessori Matters (small chain)";
  if (/^nexus/.test(n)) return "Nexus (specialist)";
  if (/^naíonra|^k&l|^naionra/i.test(n)) return "Independent (Irish-medium)";
  return "Independent";
}

function makeProvider({ id, name, address, town, area, phone, serviceType, capacity }){
  const cls = classify(serviceType, name);
  const def = defaults({ typeKey: cls.typeKey, sessional: cls.sessional, name });
  return {
    id,
    name,
    type: cls.typeLabel,
    typeKey: cls.typeKey,
    address,
    eircode: "",
    lat: 0, lng: 0, // filled by geocodeTowns()
    phone: phone || "via Tusla register",
    email: "",
    website: "",
    hours: cls.sessional ? "Sessional hours (verify)" : "7:30–18:00 Mon–Fri (typical)",
    age_range: "0–5 yrs (verify)",
    monthly_fee: def.monthly_fee,
    post_universal: def.post_universal,
    weekly: def.weekly,
    ecce: def.ecce,
    core_funding: def.core_funding,
    montessori: cls.montessoriFlag,
    outdoor: false,
    meals: !cls.sessional,
    waitlist: def.waitlist,
    waitlist_months: def.waitlist_months,
    stability: def.stability,
    staff_concern: "Unknown",
    chain: chainFromName(name),
    sessional: cls.sessional || undefined,
    opening_status: "unknown",
    last_verified: TODAY,
    notes: `Tusla register, March 2026. Capacity: ${capacity || "n/a"}. Service type: ${serviceType}. Fees and hours are estimates — verify directly.`,
    area, // Lucan | Clondalkin | Kildare-<town>
    town
  };
}

// ============================================================
// Parser for the Kildare PDF text (multi-line entries)
// ============================================================
const NEARBY_REGEX_PARTS = [...NEARBY_KILDARE];

function parseKildarePdf(textPath){
  if (!fs.existsSync(textPath)){
    console.warn(`[parseKildarePdf] missing ${textPath}, skipping`);
    return [];
  }
  const lines = fs.readFileSync(textPath, "utf8").split(/\n/);
  const entries = [];
  let buffer = []; // pending lines for the current entry

  for (const line of lines){
    if (/^TU20/.test(line)){
      // This is the entry footer line. The buffer holds the wrapped name + address.
      buffer.push(line);
      const entry = parseKildareBlock(buffer);
      if (entry) entries.push(entry);
      buffer = [];
    } else if (/^\s*$/.test(line)){
      // Blank line — usually between entries. Reset buffer if we haven't seen TU yet.
      if (buffer.length === 0) continue;
      // Otherwise keep buffering (sometimes blank lines appear inside entries)
    } else if (/Early Years Services|Tusla Number|Service Name|Person in Charge|Accommodate|Conditions|Provider/.test(line)){
      // Page header repeats — discard
      continue;
    } else {
      buffer.push(line);
    }
  }
  return entries;
}

function parseKildareBlock(blockLines){
  if (!blockLines || !blockLines.length) return null;
  const tuLine = blockLines[blockLines.length - 1];
  if (!/^TU20/.test(tuLine)) return null;
  const before = blockLines.slice(0, -1);

  // Extract from the TU line:
  // Phone: 9-10 digits, possibly with spaces
  const phoneMatch = tuLine.match(/(\+?353\s*[0-9]{8,9}|0\d{8,9}|0\d\s*\d{6,7}|0\d{2}\s*\d{6,7})/);
  const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, "") : "";

  // Service type: known phrases at the right side of the line
  const serviceTypeMatch = tuLine.match(/(Full Day, Part Time, Sessional|Full Day, Sessional|Part Time, Sessional|Full Day|Part Time|Sessional|Drop-In)/);
  const serviceType = serviceTypeMatch ? serviceTypeMatch[0] : "Sessional";

  // Capacity: a number that appears just before the date
  const capDateMatch = tuLine.match(/\b(\d{1,3})\s+(\d{2}\/\d{2}\/\d{4})\s*$/);
  const capacity = capDateMatch ? parseInt(capDateMatch[1], 10) : null;

  // The TU line contains "Kildare" twice: first as part of "Co. Kildare"
  // (address), then again as the County column. Find the LAST occurrence
  // of "  Kildare  " (county column has wider spacing) and capture the
  // town that immediately precedes it.
  const tuRest1 = tuLine.replace(/^TU20\w+\s+/, "");
  // Match "<TOWN><whitespace>Kildare<whitespace>" greedily, picking the rightmost
  const re = /([A-Za-zÁÉÍÓÚáéíóúüöäï\.\-]+(?:[\s\-][A-Za-zÁÉÍÓÚáéíóúüöäï\.\-]+){0,3})\s{2,}Kildare\s{2,}/g;
  let m, lastTown = "";
  while ((m = re.exec(tuRest1)) !== null) lastTown = m[1].trim();
  const town = lastTown;
  if (!town || !NEARBY_KILDARE.has(town)) return null; // outside our scope

  // The PDF (pdftotext -layout) output uses fixed-width columns. By inspection:
  //   col 17-37  = Service Name
  //   col 37-65  = Address
  //   col 65+    = Town, then County, then more...
  // Wrapped lines BEFORE the TU line keep the same column positions, just
  // with most slots blank.
  const NAME_COL = [17, 37];
  const ADDR_COL = [37, 65];
  function slice(line, [a, b]){
    if (line.length < a) return "";
    return line.slice(a, b).trim();
  }
  const nameParts = [];
  const addrParts = [];
  for (const l of before){
    const n = slice(l, NAME_COL);
    const a = slice(l, ADDR_COL);
    if (n) nameParts.push(n);
    if (a) addrParts.push(a);
  }
  // The TU line itself
  const tuName = slice(tuLine, NAME_COL);
  const tuAddr = slice(tuLine, ADDR_COL);
  if (tuName) nameParts.push(tuName);
  if (tuAddr) addrParts.push(tuAddr);

  const name = nameParts.join(" ").replace(/\s+/g, " ").trim();
  let address = addrParts.join(", ").replace(/\s+/g, " ").replace(/,+/g, ",").replace(/,\s*,/g, ",").trim();
  // Normalise BEFORE splitting:
  //   "Co., Kildare" -> "Co. Kildare" (stray comma)
  //   Strip everything from the FIRST "Co. Kildare" / "Co Kildare" onward in
  //   the whole string (the address bleed-over from the next column always
  //   sits past that anchor point).
  address = address
    .replace(/Co\.?\s*,\s*Kildare/gi, "Co. Kildare")
    .replace(/Co\.?\s*Kildare.*$/i, "");
  // Dedup remaining fragments
  {
    const parts = address.split(",").map(s => s.trim()).filter(Boolean);
    const kept = [];
    for (const p of parts){
      if (kept.some(k => k.toLowerCase() === p.toLowerCase())) continue;
      if (kept.some(k => k.toLowerCase().startsWith(p.toLowerCase()) && k.length > p.length)) continue;
      for (let i = kept.length - 1; i >= 0; i--){
        if (p.toLowerCase().startsWith(kept[i].toLowerCase()) && p.length > kept[i].length){
          kept.splice(i, 1);
        }
      }
      kept.push(p);
    }
    address = kept.join(", ") + ", Co. Kildare";
  }

  if (!name || !address) return null;
  return {
    name,
    address: address.endsWith("Co. Kildare") ? address : `${address}, Co. Kildare`,
    town,
    phone,
    serviceType,
    capacity
  };
}

// ============================================================
// Geocoding helpers (Nominatim)
// ============================================================
async function nominatim(query){
  const url = "https://nominatim.openstreetmap.org/search?" + new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: "ie"
  });
  const r = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!r.ok) return null;
  const arr = await r.json();
  if (!arr.length) return null;
  return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
}
async function geocodeTown(town, county){
  return nominatim(`${town}, ${county}, Ireland`);
}

function distKm(a, b){
  const R = 6371;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat/2)**2 +
            Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
            Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Try to address-geocode a single entry. Returns null if the result is
// further than 4 km from the town centroid (sanity check) or if Nominatim
// doesn't find the address. We strip the building number/unit prefix
// because Nominatim's Irish street coverage is patchy at the building
// level but reliable for streets.
async function geocodeAddress(seed, townCentroid){
  // Tries: (1) full address as-is, (2) without leading building/unit, (3) just street + town
  const addr = (seed.address || "").trim();
  if (!addr) return null;
  const noPrefix = addr.replace(/^(Unit\s+\w+,?\s*|U\d+\s*,?\s*|\d+[A-Za-z]?\s*,?\s*)+/i, "");
  const queries = [];
  queries.push(`${addr}, Ireland`);
  if (noPrefix !== addr) queries.push(`${noPrefix}, Ireland`);
  // Take the first comma-separated chunk (street name) + town + Ireland
  const parts = addr.split(",").map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2){
    const street = parts[0].replace(/^(Unit\s+\w+|U\d+|\d+[A-Za-z]?)\s*/i, "").trim();
    if (street && street.length > 3){
      queries.push(`${street}, ${seed.town}, Ireland`);
    }
  }
  for (const q of queries){
    const c = await nominatim(q);
    await sleep(SLEEP_MS);
    if (!c) continue;
    const d = distKm(c, townCentroid);
    if (d > 4) continue; // outside town, probably wrong match
    return c;
  }
  return null;
}

// Deterministic small jitter so providers in the same town don't pile up.
// Seeded by the entry's name+address so the position is stable across runs.
function jitter(seed){
  let h = 0;
  for (let i = 0; i < seed.length; i++){ h = (h * 31 + seed.charCodeAt(i)) >>> 0; }
  // ~50-100m radius in lat/lng (1 degree ~ 111 km)
  const dx = ((h & 0xff) - 128) / 128 * 0.0009;
  const dy = (((h >> 8) & 0xff) - 128) / 128 * 0.0009;
  return { dx, dy };
}

// ============================================================
// Main
// ============================================================
async function main(){
  console.log("Ingesting Tusla Early Years register...");

  const seeds = [];
  // Lucan
  for (const [name, address, serviceType, capacity] of LUCAN){
    seeds.push({ name, address, town: "Lucan", area: "Lucan", serviceType, capacity });
  }
  // Clondalkin
  for (const [name, address, serviceType, capacity] of CLONDALKIN){
    seeds.push({ name, address, town: "Clondalkin", area: "Clondalkin", serviceType, capacity });
  }
  // Kildare nearby
  const kildareEntries = parseKildarePdf("/tmp/kildare_tusla.txt");
  for (const e of kildareEntries){
    seeds.push({
      name: e.name,
      address: e.address,
      town: e.town,
      area: `Kildare`,
      phone: e.phone,
      serviceType: e.serviceType,
      capacity: e.capacity
    });
  }
  console.log(`  Lucan: ${LUCAN.length}, Clondalkin: ${CLONDALKIN.length}, Kildare nearby: ${kildareEntries.length}, total: ${seeds.length}`);

  // Geocode each unique town
  const uniqueTowns = [...new Set(seeds.map(s => s.town))];
  console.log(`Geocoding ${uniqueTowns.length} unique towns:`, uniqueTowns.join(", "));
  const townCoords = {};
  for (const t of uniqueTowns){
    const county = (t === "Lucan" || t === "Clondalkin") ? "Co. Dublin" : "Co. Kildare";
    let c = await geocodeTown(t, county);
    if (!c){
      console.warn(`  ${t}: NOT FOUND, falling back to Lucan centre`);
      c = { lat: 53.3548, lng: -6.4485 };
    } else {
      console.log(`  ${t}: ${c.lat.toFixed(4)},${c.lng.toFixed(4)}`);
    }
    townCoords[t] = c;
    await sleep(SLEEP_MS);
  }

  // Build provider entries with address-level geocoding (with town-centroid fallback)
  console.log(`Address-geocoding ${seeds.length} providers (slow, ~1.1s each)...`);
  const providers = [];
  let addressHits = 0, townFallbacks = 0;
  for (let i = 0; i < seeds.length; i++){
    const s = seeds[i];
    const t = townCoords[s.town];
    const j = jitter(s.name + s.address);

    let coord = null;
    let coordSource = "town";
    // Skip address geocoding for childminders that already have lat/lng from prior dataset
    coord = await geocodeAddress(s, t);
    if (coord){
      coordSource = "address";
      addressHits++;
    } else {
      coord = { lat: t.lat + j.dy, lng: t.lng + j.dx };
      townFallbacks++;
    }

    const p = makeProvider({
      id: i + 1,
      name: s.name,
      address: s.address,
      town: s.town,
      area: s.area,
      phone: s.phone,
      serviceType: s.serviceType,
      capacity: s.capacity
    });
    p.lat = parseFloat(coord.lat.toFixed(5));
    p.lng = parseFloat(coord.lng.toFixed(5));
    p.coord_source = coordSource;
    providers.push(p);

    // Progress log every 25 entries
    if ((i + 1) % 25 === 0 || i === seeds.length - 1){
      console.log(`  ${i + 1}/${seeds.length}  address: ${addressHits}  town-fallback: ${townFallbacks}`);
    }
  }

  // Add the existing childminders (they aren't on the Tusla Early Years register
  // in the same way; keep them so the dataset isn't a regression). We hand-port
  // these by reading the current providers.js.
  const existingPath = path.join(__dirname, "..", "data", "providers.js");
  const existingCode = fs.readFileSync(existingPath, "utf8");
  global.window = {};
  new Function(existingCode).call(global);
  const existingProviders = global.window.PROVIDERS || [];
  const childminders = existingProviders.filter(p => p.typeKey === "childminder");
  for (const cm of childminders){
    providers.push({
      ...cm,
      id: providers.length + 1,
      area: "Lucan",
      town: "Lucan",
      coord_source: cm.coord_source || "address", // childminders' coords were geocoded earlier
      notes: `${cm.notes || ""} (Tusla Childminder Register; preserved across the Mar 2026 ingestion).`.trim()
    });
  }
  console.log(`Preserved ${childminders.length} existing childminders.`);

  // Emit data/providers.js
  const header = `/* ============================================================
   Lucan & Kildare Childcare Navigator - provider dataset
   Generated by scripts/ingest_tusla.js on ${TODAY}
   Source: Tusla Early Years Register (March 2026, Lucan + Clondalkin
   tables verbatim from the user; nearby Kildare from
   tusla.ie/uploads/content/Kildare__Mar26.pdf, parsed and filtered to
   commute-relevant towns).
   See data/README.md for the schema and how to update an opening.
   ============================================================ */

window.PROVIDERS = `;

  const body = JSON.stringify(providers, null, 2);
  fs.writeFileSync(existingPath, header + body + ";\n");
  console.log(`Wrote ${providers.length} providers to ${existingPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
