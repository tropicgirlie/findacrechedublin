/* ============================================================
   Lucan Childcare Navigator: app.js
   All logic: data, map, cards, simulator, checklist, shortlist tracker
   Provider data is loaded from data/providers.js (window.PROVIDERS).
   ============================================================ */

// ---------- HOME, USER PROFILE, TRACKER KEY ----------
// Approximate K78 V295 reference point (Lucan village). Used for walking-time
// estimates only. Edit here to refine.
const HOME = { eircode: "K78 V295", lat: 53.3548, lng: -6.4485 };

// Defaults for the email sign-off. Override via the Settings panel; values
// persist in localStorage under USER_PROFILE_KEY.
const USER_PROFILE_KEY = "lucan-creche-profile-v1";
const USER_PROFILE_DEFAULTS = {
  parent_name: "",
  parent_phone: ""
};

// Shortlist tracker (browser-only, localStorage). One entry per provider id.
const TRACKER_KEY = "lucan-creche-tracker-v1";

// Per-provider price overrides (browser-only, localStorage). Keyed by id.
// Stores { monthly_fee, weekly, verified_date } when the user confirms a fee
// directly with the provider. Absence = the dataset value is shown as
// "Unconfirmed estimate". Presence = "✓ You verified".
const PRICE_OVERRIDE_KEY = "lucan-creche-prices-v1";

// Per-provider opening-status overrides. Mirrors the price-override pattern:
// the dataset's `opening_status` is the fork-default; the localStorage value
// is what THIS visitor has confirmed for themselves.
const STATUS_OVERRIDE_KEY = "lucan-creche-status-v1";

// User's chosen home anchor (overrides the per-fork HOME default below).
// Stores { eircode, lat, lng } when the visitor has set their own location.
const HOME_OVERRIDE_KEY = "lucan-creche-home-v1";

// User preferences (Step 1): max-walk minutes, etc.
const PREFS_KEY = "lucan-creche-prefs-v1";
const PREFS_DEFAULTS = { max_walk_min: 20 };

// First-visit location prompt. Set to "1" once the user has answered
// (used, typed, or explicitly dismissed) so we do not nag every page load.
const LOCATION_PROMPT_DISMISSED_KEY = "lucan-creche-loc-prompt-dismissed-v1";

// User-added providers (browser-only, localStorage). Stored as an array of
// provider objects with negative ids so they never collide with the built-in
// dataset (which uses positive ids 1+).
const USER_PROVIDERS_KEY = "lucan-creche-user-providers-v1";

// Currently-selected area pill (Lucan / Clondalkin / Kildare / "all"). The
// pill row above the map filters both the markers and the compare table.
let currentArea = "all";

// Compare-table pagination. Show this many cards by default; "Show more"
// adds another batch. Resets to PAGE_SIZE on filter/sort/area change.
const PAGE_SIZE = 12;
let visibleCount = PAGE_SIZE;

// NCS Universal hourly rate × max hours/week × ~4.33 weeks/month
// Used to recompute post_universal when the user edits the monthly fee.
const NCS_UNIVERSAL_MONTHLY = Math.round(2.14 * 45 * 4.33); // ≈ 417

// ---------- DATA ----------
// IMPORTANT: providers must be a DEFENSIVE COPY of window.PROVIDERS, not a
// shared reference. Otherwise refreshProviderList() (which mutates this array
// in place) would also empty window.PROVIDERS, breaking the subsequent rebuild.
const DATA = {
  metadata: {
    area: "Lucan, County Dublin, Ireland",
    research_date: "2026-04-02",
    center: { lat: 53.3565, lng: -6.4489 }
  },
  providers: (typeof window !== "undefined" && Array.isArray(window.PROVIDERS))
    ? window.PROVIDERS.slice()
    : []
};


// ---------- Helpers ----------
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
const fmtEUR = (n) => "€" + Math.round(n).toLocaleString("en-IE");
const fmtEURdec = (n) => "€" + n.toFixed(0);

function riskClass(risk){
  if (risk === "Low") return "low";
  if (risk === "Medium") return "med";
  return "high"; // High, Very High
}
function riskBadgeClass(risk){
  return `badge badge--wait-${riskClass(risk)}`;
}

// ---------- Distance from HOME (Haversine, walking minutes) ----------
function haversineKm(a, b){
  const R = 6371;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat/2)**2 +
            Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
            Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
// Path factor 1.3 over straight-line km, 5 km/h walking speed.
function walkingMinutes(p){
  const km = haversineKm(effectiveHome(), { lat: p.lat, lng: p.lng });
  return Math.round((km * 1.3) / 5 * 60);
}
function walkingKm(p){
  return haversineKm(effectiveHome(), { lat: p.lat, lng: p.lng });
}

// ---------- ECCE eligibility window ----------
// Returns the birth-year window for the CURRENT or UPCOMING ECCE programme
// year. Children are eligible for ECCE in a given school year if they are
// 2y8m or older on 1 September of that year (and not over 5y6m at the end).
// Window: 1 Jan of (year - 4) to 31 Dec of (year - 3) approximately.
function currentEcceWindow(){
  const now = new Date();
  // ECCE year runs Sep–Aug. If we're past 1 Sep, "current" year starts this
  // Sep; otherwise it's the Sep that just passed.
  const yr = (now.getMonth() >= 8) ? now.getFullYear() : now.getFullYear() - 1;
  // For ECCE year yr (Sep yr - Aug yr+1):
  //   - Child must be 2y8m on 1 Sep yr  ->  born by ~Dec (yr - 3)
  //   - Child must be <= 5y6m at end    ->  born after ~Jan (yr - 4)
  return { fromYear: yr - 4, toYear: yr - 3, schoolYear: yr };
}
function ecceWindowLabel(){
  const w = currentEcceWindow();
  const next = { fromYear: w.fromYear + 1, toYear: w.toYear + 1, schoolYear: w.schoolYear + 1 };
  return {
    current: `Born ${w.fromYear}–${String(w.toYear).slice(-2)}`,
    currentLong: `Children born ${w.fromYear}–${w.toYear} are eligible for the ${w.schoolYear}/${String(w.schoolYear + 1).slice(-2)} ECCE year (free preschool, 3 hrs/day, 38 weeks)`,
    next: `Next: ${next.fromYear}–${String(next.toYear).slice(-2)}`,
    nextLong: `Children born ${next.fromYear}–${next.toYear} will be eligible from Sep ${next.schoolYear}.`
  };
}

// ---------- Opening status badges ----------
const OPENING_LABELS = {
  open:     { text: "Open spot", icon: "✅", cls: "open" },
  waitlist: { text: "Waitlist",  icon: "⏳", cls: "waitlist" },
  full:     { text: "Full",      icon: "❌", cls: "full" },
  unknown:  { text: "Status unknown", icon: "❓", cls: "unknown" }
};
function openingBadgeHTML(status){
  const o = OPENING_LABELS[status] || OPENING_LABELS.unknown;
  return `<span class="open-badge open-badge--${o.cls}">${o.icon} ${o.text}</span>`;
}

// ---------- PRICE OVERRIDES (localStorage-backed) ----------
function loadPriceOverrides(){
  try { return JSON.parse(localStorage.getItem(PRICE_OVERRIDE_KEY)) || {}; }
  catch { return {}; }
}
function savePriceOverrides(map){
  try { localStorage.setItem(PRICE_OVERRIDE_KEY, JSON.stringify(map)); } catch {}
}
function setPriceOverride(providerId, fields){
  const map = loadPriceOverrides();
  map[providerId] = { ...fields, verified_date: todayISO() };
  savePriceOverrides(map);
}
function clearPriceOverride(providerId){
  const map = loadPriceOverrides();
  delete map[providerId];
  savePriceOverrides(map);
}
// Returns { monthly_fee, weekly, post_universal, verified, verified_date }
// blending dataset values with the user's override (if any).
function effectivePrice(p){
  const map = loadPriceOverrides();
  const o = map[p.id];
  if (!o){
    return {
      monthly_fee: p.monthly_fee,
      weekly: p.weekly,
      post_universal: p.post_universal,
      verified: false,
      verified_date: null
    };
  }
  let monthly = o.monthly_fee != null ? o.monthly_fee : p.monthly_fee;
  let weekly = o.weekly != null ? o.weekly : p.weekly;
  // Recompute the missing one if only one was edited
  if (o.monthly_fee != null && o.weekly == null){
    weekly = Math.round(monthly / 4.33);
  } else if (o.weekly != null && o.monthly_fee == null){
    monthly = Math.round(weekly * 4.33);
  }
  // Auto-recalc post_universal (monthly minus full NCS Universal subsidy)
  const post_universal = Math.max(0, monthly - NCS_UNIVERSAL_MONTHLY);
  return {
    monthly_fee: monthly,
    weekly,
    post_universal,
    verified: true,
    verified_date: o.verified_date || null
  };
}

// ---------- USER-ADDED PROVIDERS (per-visitor, localStorage) ----------
// Stored as plain provider objects keyed by negative id so they never collide
// with the built-in dataset (which uses positive ids).
function loadUserProviders(){
  try {
    const raw = JSON.parse(localStorage.getItem(USER_PROVIDERS_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}
function saveUserProviders(list){
  try { localStorage.setItem(USER_PROVIDERS_KEY, JSON.stringify(list)); } catch {}
}
function nextUserProviderId(){
  const list = loadUserProviders();
  // Smallest existing negative id minus 1, defaulting to -1
  const min = list.reduce((acc, p) => Math.min(acc, p.id || 0), 0);
  return min - 1;
}
function addUserProvider(input){
  const list = loadUserProviders();
  const id = nextUserProviderId();
  const provider = {
    // Required user input
    id,
    name: String(input.name || "").trim(),
    address: String(input.address || "").trim(),
    eircode: String(input.eircode || "").trim().toUpperCase(),
    lat: parseFloat(input.lat),
    lng: parseFloat(input.lng),
    typeKey: input.typeKey || "creche",
    type: input.type || ({
      creche: "Full Day Crèche",
      montessori: "Montessori / Sessional",
      childminder: "Tusla Registered Childminder",
      playschool: "Playschool"
    }[input.typeKey] || "Full Day Crèche"),
    // Optional
    phone: String(input.phone || "").trim(),
    email: String(input.email || "").trim(),
    website: String(input.website || "").trim(),
    age_range: String(input.age_range || "").trim() || "—",
    hours: String(input.hours || "").trim() || "—",
    notes: String(input.notes || "").trim() || `Added by you on ${todayISO()}.`,
    // Sensible defaults so the provider renders cleanly
    monthly_fee: parseInt(input.monthly_fee, 10) || 0,
    weekly: parseInt(input.weekly, 10) || 0,
    post_universal: 0,
    ecce: !!input.ecce,
    core_funding: !!input.core_funding,
    montessori: input.typeKey === "montessori",
    outdoor: false,
    meals: false,
    waitlist: "Unknown",
    waitlist_months: 0,
    stability: 5,
    staff_concern: "Unknown",
    chain: "Independent (added by you)",
    opening_status: "unknown",
    last_verified: todayISO(),
    // Flag so the card renderer can show a badge
    source: "user",
    added_date: todayISO()
  };
  list.push(provider);
  saveUserProviders(list);
  return provider;
}
function removeUserProvider(id){
  saveUserProviders(loadUserProviders().filter(p => p.id !== id));
}
function isUserProvider(p){
  return p && p.source === "user";
}

// Rebuild DATA.providers from the built-in dataset + any localStorage adds.
// Mutates the existing array so existing references stay valid.
function refreshProviderList(){
  const builtIn = (typeof window !== "undefined" && Array.isArray(window.PROVIDERS)) ? window.PROVIDERS : [];
  const userAdded = loadUserProviders();
  DATA.providers.length = 0;
  DATA.providers.push(...builtIn, ...userAdded);
}

// ---------- STATUS OVERRIDES (per-provider, localStorage) ----------
function loadStatusOverrides(){
  try { return JSON.parse(localStorage.getItem(STATUS_OVERRIDE_KEY)) || {}; }
  catch { return {}; }
}
function saveStatusOverrides(map){
  try { localStorage.setItem(STATUS_OVERRIDE_KEY, JSON.stringify(map)); } catch {}
}
function setStatusOverride(providerId, status){
  const map = loadStatusOverrides();
  map[providerId] = { status, verified_date: todayISO() };
  saveStatusOverrides(map);
}
function clearStatusOverride(providerId){
  const map = loadStatusOverrides();
  delete map[providerId];
  saveStatusOverrides(map);
}
// Returns { status, source: "user"|"dataset", verified_date }.
function effectiveStatus(p){
  const map = loadStatusOverrides();
  const o = map[p.id];
  if (o) return { status: o.status, source: "user", verified_date: o.verified_date || null };
  return { status: p.opening_status || "unknown", source: "dataset", verified_date: p.last_verified || null };
}

// ---------- HOME OVERRIDE (per-visitor, localStorage) ----------
function loadHomeOverride(){
  try { return JSON.parse(localStorage.getItem(HOME_OVERRIDE_KEY)); }
  catch { return null; }
}
function saveHomeOverride(home){
  try { localStorage.setItem(HOME_OVERRIDE_KEY, JSON.stringify(home)); } catch {}
}
function clearHomeOverride(){
  try { localStorage.removeItem(HOME_OVERRIDE_KEY); } catch {}
}
// Merges: localStorage override (if any) over the per-fork HOME default.
function effectiveHome(){
  const o = loadHomeOverride();
  if (o && Number.isFinite(o.lat) && Number.isFinite(o.lng)){
    return { eircode: o.eircode || HOME.eircode, lat: o.lat, lng: o.lng };
  }
  return HOME;
}

// ---------- FIRST-VISIT LOCATION PROMPT ----------
function locationPromptAlreadyAnswered(){
  try {
    return !!loadHomeOverride() || localStorage.getItem(LOCATION_PROMPT_DISMISSED_KEY) === "1";
  } catch { return false; }
}
function markLocationPromptAnswered(){
  try { localStorage.setItem(LOCATION_PROMPT_DISMISSED_KEY, "1"); } catch {}
}

// Reverse-geocode lat/lng to a friendly Irish area name (town / postcode)
// using OSM Nominatim. Falls back to "your area" if anything goes wrong.
async function reverseGeocode(lat, lng){
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`;
    const r = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const a = j.address || {};
    return a.postcode || a.suburb || a.village || a.town || a.city || a.county || "your area";
  } catch {
    return "your area";
  }
}

async function useBrowserLocation(){
  const errEl = document.getElementById("loc-prompt-error");
  if (!navigator.geolocation){
    if (errEl){
      errEl.hidden = false;
      errEl.textContent = "Your browser doesn't support location. Type your eircode instead.";
    }
    return;
  }
  if (errEl) errEl.hidden = true;
  const btn = document.getElementById("loc-use-browser");
  if (btn){ btn.disabled = true; btn.textContent = "Getting your location…"; }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const label = await reverseGeocode(lat, lng);
      saveHomeOverride({ eircode: label, lat, lng });
      markLocationPromptAnswered();
      hideLocationPrompt();
      updateHomeBanner();
      updateRecommendedHeader();
      renderProviders();
      renderRecommended();
      renderShortlist();
      if (typeof applyMapFilters === "function") applyMapFilters();
      if (typeof map !== "undefined" && map && map.setView){
        map.setView([lat, lng], map.getZoom());
      }
    },
    (err) => {
      if (btn){ btn.disabled = false; btn.textContent = "📍 Use my location"; }
      if (errEl){
        errEl.hidden = false;
        errEl.textContent = err.code === 1
          ? "Location permission denied. Type your eircode below or stay with Lucan defaults."
          : "Couldn't get your location. Try typing your eircode instead.";
      }
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
  );
}

function hideLocationPrompt(){
  const el = document.getElementById("location-prompt");
  if (el) el.hidden = true;
}
function showLocationPrompt(){
  const el = document.getElementById("location-prompt");
  if (el) el.hidden = false;
}
function dismissLocationPrompt(){
  markLocationPromptAnswered();
  hideLocationPrompt();
  updateRecommendedHeader();
}

function updateRecommendedHeader(){
  const titleEl = document.getElementById("recommended-title");
  const ledeEl = document.getElementById("recommended-lede");
  if (!titleEl || !ledeEl) return;
  const home = effectiveHome();
  const userSet = !!loadHomeOverride();
  if (userSet){
    titleEl.textContent = `Top matches near ${home.eircode}.`;
    ledeEl.innerHTML = `Open spots ranked first. The map shows just these matches. Click <em>Add to shortlist</em> on the ones you'd like to contact.`;
  } else {
    titleEl.textContent = `Top matches in Lucan (default).`;
    ledeEl.innerHTML = `Anchored at K78 V295 because you haven't told the site where you live yet. Open spots ranked first. <a href="#step1" class="recommended-set-home-link">Set your home</a> to get matches near you.`;
  }
}

function wireLocationPrompt(){
  const useBtn = document.getElementById("loc-use-browser");
  const dismissBtn = document.getElementById("loc-dismiss");
  const setBtn = document.getElementById("loc-set-eircode");
  if (useBtn) useBtn.addEventListener("click", useBrowserLocation);
  if (dismissBtn) dismissBtn.addEventListener("click", dismissLocationPrompt);
  if (setBtn) setBtn.addEventListener("click", () => {
    // Do not preventDefault. Anchor jumps to #step1. Mark answered so the
    // prompt does not reappear on next page load.
    markLocationPromptAnswered();
    hideLocationPrompt();
  });

  if (!locationPromptAlreadyAnswered()){
    showLocationPrompt();
  }
}

// ---------- USER PREFERENCES (Step 1) ----------
function loadPrefs(){
  try { return { ...PREFS_DEFAULTS, ...(JSON.parse(localStorage.getItem(PREFS_KEY)) || {}) }; }
  catch { return { ...PREFS_DEFAULTS }; }
}
function savePrefs(p){
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
}

// ---------- USER PROFILE (localStorage-backed) ----------
function loadProfile(){
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return { ...USER_PROFILE_DEFAULTS };
    return { ...USER_PROFILE_DEFAULTS, ...JSON.parse(raw) };
  } catch { return { ...USER_PROFILE_DEFAULTS }; }
}
function saveProfile(profile){
  try { localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile)); } catch {}
}
let PROFILE = loadProfile();

// ---------- TRACKER (shortlist, localStorage-backed) ----------
const TRACKER_STATUSES = [
  { key: "not_contacted", label: "Not contacted yet" },
  { key: "email_sent",    label: "Email sent" },
  { key: "called",        label: "Phoned" },
  { key: "replied",       label: "Replied" },
  { key: "visited",       label: "Visited" },
  { key: "on_waitlist",   label: "On waitlist" },
  { key: "accepted",      label: "Accepted (place offered)" },
  { key: "declined",      label: "Declined / no place" }
];
function loadTracker(){
  try { return JSON.parse(localStorage.getItem(TRACKER_KEY)) || {}; }
  catch { return {}; }
}
function saveTracker(tracker){
  try { localStorage.setItem(TRACKER_KEY, JSON.stringify(tracker)); } catch {}
}
function todayISO(){ return new Date().toISOString().slice(0, 10); }
function addDaysISO(iso, days){
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function ensureEntry(tracker, providerId){
  if (!tracker[providerId]){
    tracker[providerId] = {
      provider_id: providerId,
      status: "not_contacted",
      contacted_dates: [],
      last_reply: null,
      next_followup: todayISO(),
      notes: "",
      stop_outreach: false
    };
  }
  return tracker[providerId];
}
function inShortlist(providerId){
  const t = loadTracker();
  return Object.prototype.hasOwnProperty.call(t, providerId);
}
function addToShortlist(providerId){
  const t = loadTracker();
  ensureEntry(t, providerId);
  saveTracker(t);
}
function removeFromShortlist(providerId){
  const t = loadTracker();
  delete t[providerId];
  saveTracker(t);
}
function updateEntry(providerId, patch){
  const t = loadTracker();
  const e = ensureEntry(t, providerId);
  Object.assign(e, patch);
  saveTracker(t);
}

// ---------- EMAIL TEMPLATES ----------
// Kept short and generic. The mailto: opens in your mail client where you can
// add the specifics (child age, dates, schedule) before sending.
function initialEnquiryEmail(p){
  const subject = `Crèche place enquiry`;
  const body =
`Hi,

I'm enquiring about availability at ${p.name}.

Could you let me know:
 - Whether you currently have any openings
 - If not, your typical waitlist length and how to join it
 - Age groups you have space in

Happy to provide more details once I know the basics.

Thanks,
${PROFILE.parent_name || "[your name]"}${PROFILE.parent_phone ? "\n" + PROFILE.parent_phone : ""}`;
  return { subject, body };
}
function followupEmail(p){
  const subject = `Follow-up on crèche enquiry`;
  const body =
`Hi,

Just following up on my earlier enquiry at ${p.name}. Has anything changed on availability or the waitlist?

Thanks,
${PROFILE.parent_name || "[your name]"}${PROFILE.parent_phone ? "\n" + PROFILE.parent_phone : ""}`;
  return { subject, body };
}
function mailtoLink(provider, kind){
  const tpl = kind === "followup" ? followupEmail(provider) : initialEnquiryEmail(provider);
  const params = new URLSearchParams({ subject: tpl.subject, body: tpl.body });
  return `mailto:${encodeURIComponent(provider.email || "")}?${params.toString().replace(/\+/g, "%20")}`;
}
function hasUsablePhone(p){
  if (!p.phone) return false;
  const lc = p.phone.toLowerCase();
  return !lc.startsWith("via ") && lc !== "tusla register";
}
function telLink(p){
  return `tel:${p.phone.replace(/[^+0-9]/g, "")}`;
}

// ============================================================
// 1) LEAFLET MAPS (full + recommended mini-map)
// ============================================================
let map, markerLayer;
let recMap, recMarkerLayer;

function buildMap(){
  map = L.map("leaflet-map", {
    center: [DATA.metadata.center.lat, DATA.metadata.center.lng],
    zoom: 11,
    scrollWheelZoom: false
  });

  // Carto Voyager: calm, warm-toned tiles that suit the palette
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · © <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19
    }
  ).addTo(map);

  markerLayer = L.layerGroup().addTo(map);

  // Enable scroll-zoom when user clicks into map (nicer scrolling UX)
  map.on("click", () => map.scrollWheelZoom.enable());

  renderMarkers(DATA.providers);
}

function buildRecMap(){
  const el = document.getElementById("recmap");
  if (!el || typeof L === "undefined") return;
  recMap = L.map("recmap", {
    center: [DATA.metadata.center.lat, DATA.metadata.center.lng],
    zoom: 12,
    scrollWheelZoom: false,
    zoomControl: true,
    attributionControl: false
  });
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    { maxZoom: 19 }
  ).addTo(recMap);
  recMarkerLayer = L.layerGroup().addTo(recMap);
  recMap.on("click", () => recMap.scrollWheelZoom.enable());
}

function renderRecMarkers(list){
  if (!recMarkerLayer || !recMap) return;
  recMarkerLayer.clearLayers();
  list.forEach(p => {
    const m = L.marker([p.lat, p.lng], { icon: makeIcon(p.waitlist) });
    m.bindPopup(popupHTML(p), { maxWidth: 280 });
    m.addTo(recMarkerLayer);
  });
  // Also include the user's home as a small marker so they see geographic context
  const home = effectiveHome();
  if (home && Number.isFinite(home.lat) && Number.isFinite(home.lng)){
    const homeIcon = L.divIcon({
      className: "pin-wrap",
      html: `<div class="pin pin--home" aria-label="Your home">🏠</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    const hm = L.marker([home.lat, home.lng], { icon: homeIcon, zIndexOffset: 1000 });
    hm.bindPopup(`<div class="pop"><div class="pop__title">Your home: ${home.eircode}</div></div>`, { maxWidth: 220 });
    hm.addTo(recMarkerLayer);
  }
  // Fit the map to all markers + home so everything is visible
  const points = list.map(p => [p.lat, p.lng]);
  if (home && Number.isFinite(home.lat) && Number.isFinite(home.lng)){
    points.push([home.lat, home.lng]);
  }
  if (points.length > 0){
    const bounds = L.latLngBounds(points);
    recMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }
}

function makeIcon(risk){
  const cls = riskClass(risk);
  return L.divIcon({
    className: "pin-wrap",
    html: `<div class="pin pin--${cls}" aria-label="${risk} waitlist">●</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -12]
  });
}

function popupHTML(p){
  const ep = effectivePrice(p);
  const es = effectiveStatus(p);
  const home = effectiveHome();
  const feeLine = p.sessional
    ? `<strong>${fmtEUR(ep.weekly)}/wk</strong> ${ep.verified ? "✓" : "?"} (sessional, free under ECCE)`
    : `<strong>${fmtEUR(ep.monthly_fee)}/mo</strong> ${ep.verified ? "✓" : "?"} pre-subsidy`;
  const mins = walkingMinutes(p);
  const onList = inShortlist(p.id);
  const cta = onList
    ? `<button class="act act--small act--on" data-action="popup-remove-shortlist" data-id="${p.id}">★ On my shortlist</button>`
    : `<button class="act act--small act--primary" data-action="popup-add-shortlist" data-id="${p.id}">☆ Add to shortlist</button>`;
  const websiteLink = p.website
    ? `<a class="act act--small" href="${p.website}" target="_blank" rel="noopener">↗ Website</a>`
    : "";
  return `
    <div class="pop">
      <div class="pop__title">${p.name}</div>
      <div class="pop__type">${p.type}</div>
      <div class="pop__row"><span>Status</span>${openingBadgeHTML(es.status)}</div>
      <div class="pop__row"><span>From ${home.eircode}</span><strong>${mins} min walk · ${walkingKm(p).toFixed(1)} km</strong></div>
      <div class="pop__row"><span>Fee</span>${feeLine}</div>
      <div class="pop__row"><span>Hours</span><strong>${p.hours}</strong></div>
      <div class="pop__row"><span>Ages</span><strong>${p.age_range}</strong></div>
      <div class="pop__row"><span>Waitlist</span><strong>${p.waitlist} (~${p.waitlist_months} mo)</strong></div>
      <div class="pop__actions">${cta}${websiteLink}</div>
    </div>`;
}

function renderMarkers(list){
  markerLayer.clearLayers();
  list.forEach(p => {
    const m = L.marker([p.lat, p.lng], { icon: makeIcon(p.waitlist) });
    // Rebuild popup HTML on every open so the shortlist button reflects
    // current state (in case user added/removed it elsewhere).
    m.bindPopup(() => popupHTML(p), { maxWidth: 280 });
    m.addTo(markerLayer);
  });
  $("#map-count") && ($("#map-count").textContent = list.length);
}

// Document-level click delegation for buttons that live inside Leaflet popups.
// Popups are appended to the map pane outside of #provider-grid, so the
// existing handler scoped to the providers grid does not see them.
function handlePopupClick(e){
  const target = e.target.closest("[data-action='popup-add-shortlist'], [data-action='popup-remove-shortlist']");
  if (!target) return;
  // Only act when the click came from inside a Leaflet popup
  if (!target.closest(".leaflet-popup")) return;
  e.preventDefault();
  const id = parseInt(target.dataset.id, 10);
  if (!id) return;
  if (target.dataset.action === "popup-add-shortlist"){
    addToShortlist(id);
  } else {
    removeFromShortlist(id);
  }
  renderProviders();
  renderShortlist();
  // Refresh the popup so the button label updates
  if (typeof map !== "undefined" && map && map.closePopup) map.closePopup();
}

// ---------- Map filters ----------
// Render area filter pills above the map. Pills show counts and update
// `currentArea` when clicked, then re-run both filters.
function renderAreaPills(){
  const containers = $$(".area-pills");
  if (!containers.length) return;
  const counts = DATA.providers.reduce((acc, p) => {
    const a = p.area || "Lucan";
    acc[a] = (acc[a] || 0) + 1;
    return acc;
  }, {});
  const total = DATA.providers.length;
  const areas = Object.keys(counts).sort();
  const html = [
    `<button type="button" class="area-pill ${currentArea === "all" ? "is-active" : ""}" data-area="all">All <span>${total}</span></button>`,
    ...areas.map(a => `<button type="button" class="area-pill ${currentArea === a ? "is-active" : ""}" data-area="${a}">${a} <span>${counts[a]}</span></button>`)
  ].join("");
  containers.forEach(el => { el.innerHTML = html; });
}

function handleAreaPillClick(e){
  const btn = e.target.closest(".area-pill");
  if (!btn) return;
  e.preventDefault();
  currentArea = btn.dataset.area;
  resetPagination();
  renderAreaPills();
  renderProviders();
  applyMapFilters();
}

function applyMapFilters(){
  const type = $("#f-type").value;
  const budget = parseInt($("#f-budget").value, 10);
  const mont = $("#f-mont").checked;
  const ecce = $("#f-ecce").checked;
  const openOnly = $("#f-open") && $("#f-open").checked;
  const walkOnly = $("#f-walk") && $("#f-walk").checked;
  $("#f-budget-val").textContent = fmtEUR(budget);

  const filtered = DATA.providers.filter(p => {
    if (currentArea !== "all" && (p.area || "Lucan") !== currentArea) return false;
    if (type !== "all" && p.typeKey !== type) return false;
    // Use sessional weekly × 4.33 for budget check, else monthly (effective price)
    const ep = effectivePrice(p);
    const monthly = p.sessional ? Math.round(ep.weekly * 4.33) : ep.monthly_fee;
    if (monthly > budget) return false;
    if (mont && !p.montessori) return false;
    if (ecce && !p.ecce) return false;
    if (openOnly && effectiveStatus(p).status !== "open") return false;
    if (walkOnly && walkingMinutes(p) > 20) return false;
    return true;
  });
  renderMarkers(filtered);
}

// ============================================================
// 2) PROVIDER CARDS
// ============================================================
const FEAT_ICONS = {
  mont: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-6 9 6-9 6-9-6z"/><path d="M3 14l9 6 9-6"/></svg>`,
  meals:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16"/><path d="M10 4v7a3 3 0 0 1-3 3H4"/><path d="M20 4v16"/><path d="M16 4c-1 2-2 4-2 6s2 3 4 3"/></svg>`,
  out:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  ecce: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`
};

function priceVerifyBadge(ep){
  if (ep.verified){
    return `<span class="vfy vfy--ok" title="You confirmed this fee with the provider on ${ep.verified_date || "?"}">✓ You verified${ep.verified_date ? " · " + ep.verified_date : ""}</span>`;
  }
  return `<span class="vfy vfy--est" title="Inherited estimate. Call the provider and click ✎ to update.">? Unconfirmed estimate</span>`;
}

function priceEditFormHTML(p, ep){
  if (p.sessional){
    return `
      <form class="price-edit" data-action="price-form" data-id="${p.id}" data-mode="weekly">
        <label>Weekly fee (€)
          <input type="number" name="weekly" min="0" step="5" value="${ep.weekly}" />
        </label>
        <div class="price-edit__hint">Saving marks this as verified by you (today's date).</div>
        <div class="price-edit__btns">
          <button type="submit" class="act act--small">Save</button>
          <button type="button" class="act act--small act--ghost" data-action="price-reset" data-id="${p.id}">Reset to default</button>
          <button type="button" class="act act--small act--ghost" data-action="price-cancel" data-id="${p.id}">Cancel</button>
        </div>
      </form>`;
  }
  return `
    <form class="price-edit" data-action="price-form" data-id="${p.id}" data-mode="monthly">
      <label>Monthly fee (€)
        <input type="number" name="monthly_fee" min="0" step="10" value="${ep.monthly_fee}" />
      </label>
      <div class="price-edit__hint">Saving marks this as verified by you (today's date). Post-NCS-Universal figure is recalculated automatically.</div>
      <div class="price-edit__btns">
        <button type="submit" class="act act--small">Save</button>
        <button type="button" class="act act--small act--ghost" data-action="price-reset" data-id="${p.id}">Reset to default</button>
        <button type="button" class="act act--small act--ghost" data-action="price-cancel" data-id="${p.id}">Cancel</button>
      </div>
    </form>`;
}

function statusEditFormHTML(p){
  const choices = [
    { key: "open",     label: "✅ Open spot" },
    { key: "waitlist", label: "⏳ Waitlist" },
    { key: "full",     label: "❌ Full" },
    { key: "unknown",  label: "❓ Unknown" }
  ];
  const buttons = choices.map(c =>
    `<button type="button" class="act act--small" data-action="status-set" data-id="${p.id}" data-status="${c.key}">${c.label}</button>`
  ).join("");
  return `
    <div class="status-edit">
      <div class="status-edit__hint">What did the provider tell you?</div>
      <div class="status-edit__btns">${buttons}</div>
      <div class="status-edit__btns">
        <button type="button" class="act act--small act--ghost" data-action="status-reset" data-id="${p.id}">Reset to default</button>
        <button type="button" class="act act--small act--ghost" data-action="status-cancel" data-id="${p.id}">Cancel</button>
      </div>
    </div>`;
}

function statusProvenanceHTML(es){
  if (es.source === "user" && es.verified_date){
    return `<span class="vfy vfy--ok" title="You set this status on ${es.verified_date}">✓ You verified · ${es.verified_date}</span>`;
  }
  if (es.verified_date){
    return `<span class="verified">last checked ${es.verified_date}</span>`;
  }
  return "";
}

function providerCardHTML(p){
  const ep = effectivePrice(p);
  const es = effectiveStatus(p);
  const home = effectiveHome();
  const feeLabel = p.sessional
    ? `<strong>${fmtEUR(ep.weekly)}</strong><span>/wk sessional · free via ECCE</span>`
    : `<strong>${fmtEUR(ep.monthly_fee)}</strong><span>/month · pre-subsidy</span>`;
  const editPriceBtn = `<button class="price-edit-btn" data-action="price-edit" data-id="${p.id}" title="Edit / verify this fee">✎</button>`;
  const verifyBadge = priceVerifyBadge(ep);
  const editForm = priceEditFormHTML(p, ep);
  const editStatusBtn = `<button class="price-edit-btn" data-action="status-edit" data-id="${p.id}" title="Edit / verify this status">✎</button>`;
  const statusEditForm = statusEditFormHTML(p);
  const statusProv = statusProvenanceHTML(es);
  const stabPct = p.stability * 10;
  const feats = [];
  if (p.montessori) feats.push(`<span class="feat">${FEAT_ICONS.mont} Montessori</span>`);
  if (p.meals)      feats.push(`<span class="feat">${FEAT_ICONS.meals} Meals</span>`);
  if (p.outdoor)    feats.push(`<span class="feat">${FEAT_ICONS.out} Outdoor</span>`);

  const link = p.website
    ? `<a href="${p.website}" target="_blank" rel="noopener" class="pcard__link">Visit website →</a>`
    : `<span class="pcard__link pcard__link--muted">Contact via Tusla register</span>`;

  const mins = walkingMinutes(p);
  const km = walkingKm(p);
  const walkCls = mins <= 20 ? "walk-pill walk-pill--near" : "walk-pill";
  const isApprox = p.coord_source === "town";
  const approxLabel = isApprox ? " · approx" : "";
  const approxTitle = isApprox ? `Distance is approximate. Pin sits at the ${p.town} town centre because OpenStreetMap doesn't have this provider's exact street. Click ✎ on the map pin or edit lat/lng to refine.` : "";
  const distHTML = `<span class="${walkCls}${isApprox ? " walk-pill--approx" : ""}" title="${approxTitle}">🚶 ${mins} min · ${km.toFixed(1)} km${approxLabel}</span>`;
  const ecceWin = ecceWindowLabel();
  const ecceBadge = p.ecce
    ? `<span class="chip chip--ecce" title="${ecceWin.currentLong}">ECCE · ${ecceWin.current}</span>`
    : "";
  const userBadge = isUserProvider(p)
    ? `<span class="chip chip--user" title="Added by you in this browser">★ Added by you</span>`
    : "";

  const opening = openingBadgeHTML(es.status);

  const onList = inShortlist(p.id);
  const shortlistBtn = onList
    ? `<button class="act act--on" data-action="remove-shortlist" data-id="${p.id}" title="Remove from shortlist">★ On my shortlist</button>`
    : `<button class="act act--primary" data-action="add-shortlist" data-id="${p.id}" title="Add to shortlist">☆ Add to shortlist</button>`;

  const emailBtn = p.email
    ? `<a class="act" href="${mailtoLink(p, "initial")}" title="Open a pre-filled enquiry email">📧 Email</a>`
    : "";
  const callBtn = hasUsablePhone(p)
    ? `<a class="act" href="${telLink(p)}" title="Call ${p.phone}">📞 Call</a>`
    : "";

  // ---- Minimal default view: name, distance, age, cost, status, ECCE, 1 CTA ----
  // ---- Expandable details: everything else ----
  return `
    <article class="pcard" data-id="${p.id}">
      <div class="pcard__top">
        <div class="pcard__statusrow">${opening}${ecceBadge}${userBadge}</div>
        <h3 class="pcard__name">${p.name}</h3>
        <div class="pcard__minimeta">
          ${distHTML}
          <span class="age-pill">👶 ${p.age_range}</span>
        </div>
        <div class="pcard__feerow">
          <div class="pcard__fee">${feeLabel} ${editPriceBtn}</div>
          ${verifyBadge}
        </div>
        <div class="pcard__editwrap" hidden>${editForm}</div>
        <div class="pcard__statusedit" hidden>${statusEditForm}</div>
        <div class="pcard__primary-cta">${shortlistBtn}</div>
      </div>

      <details class="pcard__details">
        <summary>Show details</summary>
        <div class="pcard__details-body">
          <div class="pcard__type-row">${p.type}</div>
          <div class="pcard__meta">
            <span><b>Hours</b><br/>${p.hours}</span>
            <span><b>Area</b><br/>${p.address.split(",")[0]}</span>
            <span><b>Chain</b><br/>${p.chain}</span>
            <span><b>Waitlist</b><br/><span class="${riskBadgeClass(p.waitlist)}">${p.waitlist} · ~${p.waitlist_months} mo</span></span>
          </div>
          <div class="pcard__stability">
            Stability ${p.stability}/10
            <div class="stability-bar"><div class="stability-bar__fill" style="width:${stabPct}%"></div></div>
          </div>
          ${feats.length ? `<div class="pcard__features">${feats.join("")}</div>` : ""}
          <div class="pcard__statusprov">Opening status: ${editStatusBtn} ${statusProv}</div>
          <div class="pcard__actions">${emailBtn}${callBtn}</div>
          ${link}
        </div>
      </details>
    </article>`;
}

function renderProviders(){
  const q = $("#p-search").value.trim().toLowerCase();
  const sort = $("#p-sort").value;
  const openOnly = $("#p-open") && $("#p-open").checked;
  const walkOnly = $("#p-walk") && $("#p-walk").checked;
  let list = DATA.providers.slice();

  if (currentArea !== "all"){
    list = list.filter(p => (p.area || "Lucan") === currentArea);
  }
  if (q){
    list = list.filter(p =>
      [p.name, p.type, p.address, p.chain, p.notes].join(" ").toLowerCase().includes(q)
    );
  }
  if (openOnly) list = list.filter(p => effectiveStatus(p).status === "open");
  if (walkOnly) list = list.filter(p => walkingMinutes(p) <= 20);

  const waitOrder = { "Low":1, "Medium":2, "High":3, "Very High":4 };
  const openOrder = { "open": 1, "waitlist": 2, "unknown": 3, "full": 4 };
  const sortFns = {
    "distance":   (a,b) => {
      // Show entries with precise (address) coords first, then town-centroid
      // approx entries, each group sorted by distance.
      const aApprox = a.coord_source === "town" ? 1 : 0;
      const bApprox = b.coord_source === "town" ? 1 : 0;
      if (aApprox !== bApprox) return aApprox - bApprox;
      return walkingKm(a) - walkingKm(b);
    },
    "price":      (a,b) => effectivePrice(a).monthly_fee - effectivePrice(b).monthly_fee,
    "price-desc": (a,b) => effectivePrice(b).monthly_fee - effectivePrice(a).monthly_fee,
    "stability":  (a,b) => b.stability - a.stability,
    "waitlist":   (a,b) => waitOrder[a.waitlist] - waitOrder[b.waitlist],
    "name":       (a,b) => a.name.localeCompare(b.name)
  };
  list.sort(sortFns[sort] || sortFns["distance"]);

  // Paginate: show only the first `visibleCount` cards; surface a
  // "Show more" button when there are more.
  const total = list.length;
  const shown = list.slice(0, Math.min(visibleCount, total));
  $("#provider-grid").innerHTML = shown.map(providerCardHTML).join("");
  $("#provider-count") && ($("#provider-count").textContent = total);

  // Render the "Show more / Showing N of M" footer
  const more = $("#provider-more");
  if (more){
    if (total > shown.length){
      const remaining = total - shown.length;
      const next = Math.min(PAGE_SIZE, remaining);
      more.innerHTML = `
        <p>Showing <strong>${shown.length}</strong> of ${total}.</p>
        <button type="button" class="btn btn--ghost" id="provider-more-btn">Show ${next} more</button>
      `;
      more.hidden = false;
      const btn = $("#provider-more-btn");
      if (btn) btn.addEventListener("click", () => {
        visibleCount += PAGE_SIZE;
        renderProviders();
      });
    } else if (total > PAGE_SIZE){
      more.innerHTML = `<p>Showing all <strong>${total}</strong>. <button type="button" class="link-btn" id="provider-collapse-btn">Collapse to first ${PAGE_SIZE}</button></p>`;
      more.hidden = false;
      const btn = $("#provider-collapse-btn");
      if (btn) btn.addEventListener("click", () => {
        visibleCount = PAGE_SIZE;
        renderProviders();
        // Scroll the section heading back into view so the user sees the reset
        const sec = document.getElementById("providers");
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      more.hidden = true;
      more.innerHTML = "";
    }
  }
}

// Reset pagination whenever a filter or sort changes so the user always
// sees the first page of the new query.
function resetPagination(){
  visibleCount = PAGE_SIZE;
}

// ---------- RECOMMENDED (Step 2) ----------
// Algorithm: filter by user's max-walk preference (with a graceful fallback if
// fewer than 3 are within range), then sort by (open-status priority, walking
// distance), and take the top 6.
function renderRecommended(){
  const grid = $("#recommended-grid");
  if (!grid) return;
  const prefs = loadPrefs();
  const maxWalk = prefs.max_walk_min || 9999;
  const openOrder = { "open": 0, "waitlist": 1, "unknown": 2, "full": 3 };

  let candidates = DATA.providers.filter(p => walkingMinutes(p) <= maxWalk);
  // Graceful fallback: if too few in range, widen so we always show at least 3
  if (candidates.length < 3){
    candidates = DATA.providers.slice();
  }
  candidates.sort((a, b) => {
    const ao = openOrder[effectiveStatus(a).status] ?? 2;
    const bo = openOrder[effectiveStatus(b).status] ?? 2;
    if (ao !== bo) return ao - bo;
    return walkingKm(a) - walkingKm(b);
  });
  const top = candidates.slice(0, 6);
  grid.innerHTML = top.map(providerCardHTML).join("");
  renderRecMarkers(top);
}

// ============================================================
// 5) SHORTLIST TRACKER (My contacted providers)
// ============================================================
function shortlistRowHTML(entry, p){
  const opening = openingBadgeHTML(effectiveStatus(p).status);
  const mins = walkingMinutes(p);
  const statusOpts = TRACKER_STATUSES.map(s =>
    `<option value="${s.key}"${entry.status === s.key ? " selected":""}>${s.label}</option>`
  ).join("");
  const lastContacted = entry.contacted_dates && entry.contacted_dates.length
    ? entry.contacted_dates[entry.contacted_dates.length - 1]
    : "";
  const followupValue = entry.next_followup || "";
  const followupOverdue = followupValue && followupValue <= todayISO();

  const emailKind = entry.status === "not_contacted" ? "initial" : "followup";
  const emailLabel = emailKind === "initial" ? "📧 Send enquiry" : "📧 Send follow-up";
  const emailBtn = p.email
    ? `<a class="act act--small" href="${mailtoLink(p, emailKind)}" data-action="email-sent" data-id="${p.id}" data-kind="${emailKind}">${emailLabel}</a>`
    : `<span class="act act--small act--disabled">No email on file</span>`;
  const callBtn = hasUsablePhone(p)
    ? `<a class="act act--small" href="${telLink(p)}" data-action="called" data-id="${p.id}">📞 Call</a>`
    : "";

  return `
    <div class="srow" data-id="${p.id}">
      <div class="srow__main">
        <div class="srow__name">${p.name}</div>
        <div class="srow__meta">${opening} · ${mins} min walk · ${p.address.split(",")[0]}</div>
      </div>
      <div class="srow__status">
        <label>Status
          <select data-action="status-change" data-id="${p.id}">${statusOpts}</select>
        </label>
        <label class="srow__datelbl">Email/contact sent on
          <input type="date" data-action="last-contact-change" data-id="${p.id}" value="${lastContacted}" max="${todayISO()}" />
        </label>
        <label class="srow__datelbl">Next follow-up${followupOverdue ? ` <span class="due-flag">overdue</span>` : ""}
          <input type="date" data-action="followup-change" data-id="${p.id}" value="${followupValue}" class="${followupOverdue ? "due" : ""}" />
        </label>
      </div>
      <div class="srow__notes">
        <label>Notes
          <textarea data-action="notes-change" data-id="${p.id}" rows="3" placeholder="What did they say? Waitlist position? Visit date? Their reply?">${entry.notes || ""}</textarea>
        </label>
      </div>
      <div class="srow__actions">
        ${emailBtn}
        ${callBtn}
        <button class="act act--small act--ghost" data-action="remove-shortlist" data-id="${p.id}">Remove</button>
      </div>
    </div>`;
}

function renderShortlist(){
  const tracker = loadTracker();
  const ids = Object.keys(tracker).map(Number);
  $("#shortlist-count") && ($("#shortlist-count").textContent = ids.length);
  if (!ids.length){
    $("#shortlist-grid").innerHTML =
      `<p class="empty">Your shortlist is empty. Click <em>☆ Add to shortlist</em> on any provider below to start tracking your contacts.</p>`;
    return;
  }
  // Sort: due-now first, then by last-contact ascending (oldest first)
  const today = todayISO();
  const rows = ids
    .map(id => ({ entry: tracker[id], p: DATA.providers.find(p => p.id === id) }))
    .filter(x => x.p)
    .sort((a, b) => {
      const aDue = (a.entry.next_followup || "9999") <= today ? 0 : 1;
      const bDue = (b.entry.next_followup || "9999") <= today ? 0 : 1;
      if (aDue !== bDue) return aDue - bDue;
      const aLast = a.entry.contacted_dates.slice(-1)[0] || "0000";
      const bLast = b.entry.contacted_dates.slice(-1)[0] || "0000";
      return aLast.localeCompare(bLast);
    });
  $("#shortlist-grid").innerHTML = rows.map(({ entry, p }) => shortlistRowHTML(entry, p)).join("");
}

function shortlistToCSV(){
  const tracker = loadTracker();
  const header = ["provider_id","name","status","contacted_dates","next_followup","notes","phone","email","opening_status"];
  const lines = [header.join(",")];
  Object.values(tracker).forEach(e => {
    const p = DATA.providers.find(x => x.id === e.provider_id);
    if (!p) return;
    const row = [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      e.status,
      `"${(e.contacted_dates||[]).join("; ")}"`,
      e.next_followup || "",
      `"${(e.notes||"").replace(/"/g, '""')}"`,
      `"${p.phone||""}"`,
      `"${p.email||""}"`,
      p.opening_status || "unknown"
    ];
    lines.push(row.join(","));
  });
  return lines.join("\n");
}
function downloadCSV(){
  const csv = shortlistToCSV();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lucan-creche-shortlist-${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function togglePriceEditForm(card, show){
  const wrap = card && card.querySelector(".pcard__editwrap");
  if (!wrap) return;
  wrap.hidden = !show;
}

function handleShortlistAction(e){
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const id = parseInt(target.dataset.id, 10);
  if (!id) return;

  // Price-edit actions (cards section)
  if (action === "price-edit"){
    e.preventDefault();
    const card = target.closest(".pcard");
    const wrap = card && card.querySelector(".pcard__editwrap");
    if (wrap) wrap.hidden = !wrap.hidden;
    if (wrap && !wrap.hidden){
      const input = wrap.querySelector("input[type='number']");
      if (input) setTimeout(() => input.focus(), 0);
    }
    return;
  }
  if (action === "price-cancel"){
    e.preventDefault();
    togglePriceEditForm(target.closest(".pcard"), false);
    return;
  }
  if (action === "price-reset"){
    e.preventDefault();
    clearPriceOverride(id);
    refreshAfterPriceChange();
    return;
  }

  // Status edit actions
  if (action === "status-edit"){
    e.preventDefault();
    const card = target.closest(".pcard");
    const wrap = card && card.querySelector(".pcard__statusedit");
    if (wrap) wrap.hidden = !wrap.hidden;
    return;
  }
  if (action === "status-cancel"){
    e.preventDefault();
    const card = target.closest(".pcard");
    const wrap = card && card.querySelector(".pcard__statusedit");
    if (wrap) wrap.hidden = true;
    return;
  }
  if (action === "status-set"){
    e.preventDefault();
    const status = target.dataset.status;
    if (!status) return;
    setStatusOverride(id, status);
    refreshAfterStatusChange();
    return;
  }
  if (action === "status-reset"){
    e.preventDefault();
    clearStatusOverride(id);
    refreshAfterStatusChange();
    return;
  }

  if (action === "add-shortlist"){
    addToShortlist(id);
    renderProviders();
    renderRecommended();
    renderShortlist();
  } else if (action === "remove-shortlist"){
    removeFromShortlist(id);
    renderProviders();
    renderRecommended();
    renderShortlist();
  } else if (action === "email-sent"){
    // Don't preventDefault, we want the mailto: to open. We just record it.
    const kind = target.dataset.kind;
    const t = loadTracker();
    const entry = ensureEntry(t, id);
    entry.contacted_dates.push(todayISO());
    entry.status = "email_sent";
    entry.next_followup = addDaysISO(todayISO(), 7);
    saveTracker(t);
    setTimeout(renderShortlist, 100);
  } else if (action === "called"){
    const t = loadTracker();
    const entry = ensureEntry(t, id);
    entry.contacted_dates.push(todayISO());
    if (entry.status === "not_contacted") entry.status = "called";
    entry.next_followup = addDaysISO(todayISO(), 14);
    saveTracker(t);
    setTimeout(renderShortlist, 100);
  }
}

function handleShortlistChange(e){
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const id = parseInt(target.dataset.id, 10);
  if (!id) return;

  if (action === "status-change"){
    const status = target.value;
    const patch = { status };
    if (status === "email_sent" || status === "called"){
      patch.next_followup = addDaysISO(todayISO(), status === "called" ? 14 : 7);
    } else if (status === "replied" || status === "on_waitlist"){
      patch.last_reply = todayISO();
      patch.next_followup = addDaysISO(todayISO(), status === "on_waitlist" ? 28 : 14);
    } else if (status === "accepted" || status === "declined"){
      patch.stop_outreach = true;
      patch.next_followup = null;
    }
    updateEntry(id, patch);
    renderShortlist();
  } else if (action === "notes-change"){
    updateEntry(id, { notes: target.value });
    // No re-render. Let the user keep typing.
  } else if (action === "last-contact-change"){
    const t = loadTracker();
    const entry = ensureEntry(t, id);
    const newDate = target.value;
    if (!newDate){
      entry.contacted_dates = [];
    } else {
      // Replace the most recent entry rather than appending duplicates
      if (entry.contacted_dates.length){
        entry.contacted_dates[entry.contacted_dates.length - 1] = newDate;
      } else {
        entry.contacted_dates = [newDate];
      }
    }
    saveTracker(t);
    renderShortlist();
  } else if (action === "followup-change"){
    updateEntry(id, { next_followup: target.value || null });
    renderShortlist();
  }
}

function handlePriceFormSubmit(e){
  const form = e.target.closest("form[data-action='price-form']");
  if (!form) return;
  e.preventDefault();
  const id = parseInt(form.dataset.id, 10);
  const mode = form.dataset.mode;
  const fields = {};
  if (mode === "weekly"){
    const v = parseInt(form.elements.weekly.value, 10);
    if (!Number.isFinite(v) || v < 0) return;
    fields.weekly = v;
  } else {
    const v = parseInt(form.elements.monthly_fee.value, 10);
    if (!Number.isFinite(v) || v < 0) return;
    fields.monthly_fee = v;
  }
  setPriceOverride(id, fields);
  refreshAfterPriceChange();
}

function refreshAfterUserProviderChange(){
  refreshProviderList();
  renderProviders();
  renderShortlist();
  renderUserProviders();
  if (typeof applyMapFilters === "function") applyMapFilters();
}

function renderUserProviders(){
  const list = $("#user-providers-list");
  if (!list) return;
  const userList = loadUserProviders();
  $("#user-providers-count") && ($("#user-providers-count").textContent = userList.length);
  if (!userList.length){
    list.innerHTML = `<p class="empty">You haven't added any providers yet. Use the form above.</p>`;
    return;
  }
  list.innerHTML = userList.map(p => `
    <div class="userprov-row">
      <div>
        <strong>${p.name}</strong>
        <span>${p.address || ""} · ${p.eircode || ""}</span>
      </div>
      <button class="act act--small act--ghost" data-action="remove-user-provider" data-id="${p.id}">Remove</button>
    </div>
  `).join("");
}

function handleAddProviderSubmit(e){
  const form = e.target.closest("form#add-provider-form");
  if (!form) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  // Lightweight validation: required fields + sane lat/lng
  const errs = [];
  if (!data.name || !data.name.trim()) errs.push("Name is required.");
  if (!data.address || !data.address.trim()) errs.push("Address is required.");
  const lat = parseFloat(data.lat), lng = parseFloat(data.lng);
  if (!Number.isFinite(lat) || lat < 51 || lat > 56) errs.push("Latitude must be a number between 51 and 56 (Ireland).");
  if (!Number.isFinite(lng) || lng < -11 || lng > -5) errs.push("Longitude must be a number between -11 and -5 (Ireland).");
  const errEl = $("#add-provider-error");
  if (errs.length){
    if (errEl){
      errEl.hidden = false;
      errEl.textContent = errs.join(" ");
    }
    return;
  }
  if (errEl) errEl.hidden = true;
  addUserProvider(data);
  form.reset();
  refreshAfterUserProviderChange();
  // Scroll the new card into view in the compare grid (last position)
  const grid = $("#provider-grid");
  if (grid && grid.lastElementChild){
    grid.lastElementChild.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function handleUserProviderRemove(e){
  const target = e.target.closest("[data-action='remove-user-provider']");
  if (!target) return;
  e.preventDefault();
  const id = parseInt(target.dataset.id, 10);
  if (!id) return;
  if (!confirm("Remove this provider from your list?")) return;
  removeUserProvider(id);
  refreshAfterUserProviderChange();
}

function refreshAfterStatusChange(){
  renderProviders();
  renderRecommended();
  renderShortlist();
  if (typeof applyMapFilters === "function") applyMapFilters();
}

function refreshAfterPriceChange(){
  renderProviders();
  renderRecommended();
  renderShortlist();
  // Refresh map markers (budget filter may now match differently)
  if (typeof applyMapFilters === "function") applyMapFilters();
}

// ---------- Settings panel (user profile + home anchor) ----------
function wireSettings(){
  const fields = ["parent_name", "parent_phone"];
  fields.forEach(k => {
    const el = $("#prof-" + k);
    if (!el) return;
    el.value = PROFILE[k] != null ? PROFILE[k] : "";
    el.addEventListener("input", () => {
      PROFILE[k] = el.value;
      saveProfile(PROFILE);
      renderProviders();
      renderShortlist();
    });
  });

  // Home anchor inputs
  const home = effectiveHome();
  const homeFields = [
    { id: "home-eircode-input", key: "eircode" },
    { id: "home-lat-input", key: "lat" },
    { id: "home-lng-input", key: "lng" }
  ];
  homeFields.forEach(({ id, key }) => {
    const el = $("#" + id);
    if (!el) return;
    el.value = home[key] != null ? home[key] : "";
  });

  const saveBtn = $("#home-save-btn");
  const resetBtn = $("#home-reset-btn");
  // Walking-time preference
  const walkSel = $("#pref-max-walk");
  if (walkSel){
    const prefs = loadPrefs();
    walkSel.value = String(prefs.max_walk_min);
    walkSel.addEventListener("change", () => {
      const next = { ...loadPrefs(), max_walk_min: parseInt(walkSel.value, 10) || 9999 };
      savePrefs(next);
      renderRecommended();
    });
  }

  if (saveBtn){
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const eircode = ($("#home-eircode-input")?.value || "").trim().toUpperCase();
      const lat = parseFloat($("#home-lat-input")?.value);
      const lng = parseFloat($("#home-lng-input")?.value);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)){
        alert("Please enter both latitude and longitude as numbers.");
        return;
      }
      saveHomeOverride({ eircode, lat, lng });
      markLocationPromptAnswered();
      hideLocationPrompt();
      // Also save the walk pref in case it was changed
      const walkVal = walkSel ? parseInt(walkSel.value, 10) || 9999 : loadPrefs().max_walk_min;
      savePrefs({ ...loadPrefs(), max_walk_min: walkVal });
      updateHomeBanner();
      updateRecommendedHeader();
      renderProviders();
      renderRecommended();
      renderShortlist();
      if (typeof applyMapFilters === "function") applyMapFilters();
      if (typeof map !== "undefined" && map && map.setView){
        map.setView([lat, lng], map.getZoom());
      }
      // Scroll to recommendations so the user immediately sees the result
      const rec = $("#recommended");
      if (rec) rec.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  if (resetBtn){
    resetBtn.addEventListener("click", (e) => {
      e.preventDefault();
      clearHomeOverride();
      const def = effectiveHome();
      $("#home-eircode-input") && ($("#home-eircode-input").value = def.eircode);
      $("#home-lat-input") && ($("#home-lat-input").value = def.lat);
      $("#home-lng-input") && ($("#home-lng-input").value = def.lng);
      updateHomeBanner();
      updateRecommendedHeader();
      renderProviders();
      renderRecommended();
      renderShortlist();
      if (typeof applyMapFilters === "function") applyMapFilters();
      if (typeof map !== "undefined" && map && map.setView){
        map.setView([def.lat, def.lng], map.getZoom());
      }
    });
  }
}

function updateHomeBanner(){
  const home = effectiveHome();
  const el = $("#home-eircode");
  if (el) el.textContent = home.eircode;
}

// ============================================================
// INIT
// ============================================================
function init(){
  // Pull in any user-added providers from localStorage before any rendering
  refreshProviderList();

  // Home banner
  updateHomeBanner();
  wireLocationPrompt();

  // Map (now the main browse surface)
  buildMap();
  renderAreaPills();
  document.querySelectorAll(".area-pills").forEach(el => el.addEventListener("click", handleAreaPillClick));
  $("#f-type").addEventListener("change", applyMapFilters);
  $("#f-budget").addEventListener("input", applyMapFilters);
  $("#f-mont").addEventListener("change", applyMapFilters);
  $("#f-ecce").addEventListener("change", applyMapFilters);
  $("#f-open") && $("#f-open").addEventListener("change", applyMapFilters);
  $("#f-walk") && $("#f-walk").addEventListener("change", applyMapFilters);

  // Document-level delegation for popup buttons (popups live outside the
  // section grids in the Leaflet pane, so the per-section handlers miss them).
  document.addEventListener("click", handlePopupClick);

  // "How are prices estimated?" inline link toggles the inline <details>
  // instead of taking the user to a new anchor location.
  document.querySelectorAll("[data-toggle-why]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute("href"));
      if (target && target.tagName === "DETAILS"){
        target.open = !target.open;
        if (target.open) target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  });

  // Providers compare table
  renderProviders();
  const renderProvidersFromTop = () => { resetPagination(); renderProviders(); };
  $("#p-search").addEventListener("input", renderProvidersFromTop);
  $("#p-sort").addEventListener("change", renderProvidersFromTop);
  $("#p-open") && $("#p-open").addEventListener("change", renderProvidersFromTop);
  $("#p-walk") && $("#p-walk").addEventListener("change", renderProvidersFromTop);

  // Shortlist
  renderShortlist();
  $("#shortlist-grid") && $("#shortlist-grid").addEventListener("click", handleShortlistAction);
  $("#shortlist-grid") && $("#shortlist-grid").addEventListener("change", handleShortlistChange);
  $("#provider-grid") && $("#provider-grid").addEventListener("click", handleShortlistAction);
  $("#provider-grid") && $("#provider-grid").addEventListener("submit", handlePriceFormSubmit);
  $("#shortlist-export") && $("#shortlist-export").addEventListener("click", downloadCSV);
  $("#shortlist-print") && $("#shortlist-print").addEventListener("click", () => {
    document.body.setAttribute("data-print-date", todayISO());
    // Native print dialog. The @media print stylesheet hides everything
    // except the shortlist and reformats it for paper.
    setTimeout(() => window.print(), 50);
  });
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("printing-shortlist");
  });

  // Settings
  wireSettings();

  // Add-a-provider form
  const addForm = document.getElementById("add-provider-form");
  if (addForm) addForm.addEventListener("submit", handleAddProviderSubmit);
  const userList = document.getElementById("user-providers-list");
  if (userList) userList.addEventListener("click", handleUserProviderRemove);
  renderUserProviders();

  // Cost calculator is a link out to takehome.co; no JS wiring.
}

if (document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
