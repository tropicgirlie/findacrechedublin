/* ============================================================
   Lucan Childcare Navigator: app.js
   All logic: data, map, cards, simulator, stress test
   ============================================================ */

// ---------- DATA (embedded from lucan-childcare-data.json) ----------
const DATA = {
  metadata: {
    area: "Lucan, County Dublin, Ireland",
    research_date: "2026-04-02",
    center: { lat: 53.3565, lng: -6.4489 }
  },
  providers: [
    { id:1, name:"Giraffe Childcare Lucan", type:"Full Day Crèche & Preschool", typeKey:"creche",
      address:"Ballyowen Lane, Lucan, Co. Dublin", eircode:"K78 EV80",
      lat:53.3476, lng:-6.4287, phone:"(01) 254 1345", website:"https://www.giraffe.ie/creche-location/childcare-lucan/",
      hours:"7:30–18:00 Mon–Fri", age_range:"1–5 yrs (afterschool to 12)",
      monthly_fee:1150, post_universal:732, weekly:265, ecce:true, core_funding:true,
      montessori:false, outdoor:true, meals:true,
      waitlist:"High", waitlist_months:6, stability:8, staff_concern:"Medium",
      chain:"Giraffe Childcare (national chain)",
      notes:"Large national chain, purpose-built facility. Near Ballyowen and N4." },

    { id:2, name:"Giraffe Childcare Adamstown", type:"Full Day Crèche & Preschool", typeKey:"creche",
      address:"2 Castlegate House, Adamstown Avenue, Adamstown Castle", eircode:"K78 NH94",
      lat:53.3486, lng:-6.4652, phone:"(01) 254 1381", website:"https://www.giraffe.ie/creche-location/childcare-adamstown/",
      hours:"7:30–18:00 Mon–Fri", age_range:"12 months – 12 yrs",
      monthly_fee:1150, post_universal:732, weekly:265, ecce:true, core_funding:true,
      montessori:false, outdoor:true, meals:true,
      waitlist:"High", waitlist_months:6, stability:8, staff_concern:"Medium",
      chain:"Giraffe Childcare (national chain)",
      notes:"Voted Best Crèche 2016. Serves Adamstown, Lucan, Tallaght." },

    { id:3, name:"Giraffe Childcare Liffey Valley", type:"Full Day Crèche & Preschool", typeKey:"creche",
      address:"Liffey Valley Office Campus, Dublin 22", eircode:"D22 WO26",
      lat:53.3512, lng:-6.3951, phone:"(01) 254 1346", website:"https://www.giraffe.ie/creche-location/childcare-liffey-valley/",
      hours:"7:30–18:00 Mon–Fri", age_range:"6 months – 5 yrs",
      monthly_fee:1150, post_universal:732, weekly:265, ecce:true, core_funding:true,
      montessori:false, outdoor:true, meals:true,
      waitlist:"Medium", waitlist_months:4, stability:8, staff_concern:"Medium",
      chain:"Giraffe Childcare (national chain)",
      notes:"Near Liffey Valley SC. Off N4/M50. Commuter-friendly." },

    { id:4, name:"Cocoon Childcare Lucan", type:"Full Day Crèche & Preschool", typeKey:"creche",
      address:"Rosse Court, Balgaddy, Lucan", eircode:"K32 V205",
      lat:53.3412, lng:-6.4172, phone:"+353 1 419 9999", website:"https://cocoonchildcare.ie/find-creche/dublin-creches/cocoon-childcare-lucan",
      hours:"7:30–18:30 Mon–Fri", age_range:"1–5 yrs",
      monthly_fee:1150, post_universal:672, weekly:265, ecce:true, core_funding:true,
      montessori:true, outdoor:true, meals:true,
      waitlist:"High", waitlist_months:6, stability:7, staff_concern:"Medium",
      chain:"Cocoon Childcare (14 centres)",
      notes:"Purpose-built. Nutrition programme. Serves Lucan & Clondalkin." },

    { id:5, name:"Little Harvard Kilcarbery (Clondalkin)", type:"Full Day Crèche & Montessori", typeKey:"creche",
      address:"Kilcarbery Grange, Dublin 22", eircode:"D22 X0F0",
      lat:53.3226, lng:-6.4285, phone:"(01) 274 1056", website:"https://www.littleharvard.ie",
      hours:"7:00–18:30 Mon–Fri", age_range:"6 months – 12 yrs",
      monthly_fee:1350, post_universal:932, weekly:295, ecce:true, core_funding:true,
      montessori:true, outdoor:true, meals:true,
      waitlist:"Very High", waitlist_months:9, stability:7, staff_concern:"Medium",
      chain:"Little Harvard (20+ locations)",
      notes:"Major chain. At fee cap maximum." },

    { id:6, name:"Happy Tots Playschool & Full Day Care", type:"Playschool & Full Day Care", typeKey:"playschool",
      address:"Lucan, Co. Dublin", eircode:"K78 TY05",
      lat:53.3548, lng:-6.4510, phone:"via childcare.ie", website:"https://www.childcare.ie/county-dublin/lucan",
      hours:"8:00–18:00 Mon–Fri (est.)", age_range:"2y7m+",
      monthly_fee:950, post_universal:532, weekly:220, ecce:true, core_funding:true,
      montessori:false, outdoor:true, meals:true,
      waitlist:"Medium", waitlist_months:3, stability:5, staff_concern:"High",
      chain:"Independent",
      notes:"Independent local. Smaller operation." },

    { id:7, name:"Keane Minds Montessori School", type:"Montessori Preschool", typeKey:"montessori",
      address:"Lucan, Co. Dublin", eircode:"K78",
      lat:53.3555, lng:-6.4445, phone:"via childcare.ie", website:"https://www.childcare.ie/county-dublin/lucan",
      hours:"9:00–12:30 / extended to 14:30", age_range:"2.5–6 yrs",
      monthly_fee:320, post_universal:320, weekly:80, ecce:true, core_funding:true,
      montessori:true, outdoor:true, meals:false,
      waitlist:"Medium", waitlist_months:3, stability:4, staff_concern:"High",
      chain:"Independent", sessional:true,
      notes:"Sessional Montessori. Free under ECCE for 3 hrs. Extended hours extra. ECCE-only model most at risk of closure." },

    { id:8, name:"Sunflowers Childcare", type:"Family-run Childcare", typeKey:"creche",
      address:"Ballyowen Lane, Lucan", eircode:"K78 WF44",
      lat:53.3490, lng:-6.4320, phone:"via childcare.ie", website:"https://www.childcare.ie/county-dublin/lucan",
      hours:"7:30–18:00 Mon–Fri (est.)", age_range:"1–5 yrs",
      monthly_fee:1000, post_universal:582, weekly:230, ecce:true, core_funding:true,
      montessori:false, outdoor:true, meals:true,
      waitlist:"Medium", waitlist_months:3, stability:5, staff_concern:"High",
      chain:"Independent (family-run)",
      notes:"Small, family-run. Personal touch but less capacity." },

    { id:9, name:"The Village Montessori Pre-School", type:"Montessori Pre-School", typeKey:"montessori",
      address:"Canon Despard Centre, Chapel Hill, Lucan", eircode:"K78 YX96",
      lat:53.3575, lng:-6.4498, phone:"via childcare.ie", website:"https://www.childcare.ie/county-dublin/lucan",
      hours:"9:00–12:00 / extended to 15:00", age_range:"2.5–5.5 yrs",
      monthly_fee:340, post_universal:340, weekly:85, ecce:true, core_funding:true,
      montessori:true, outdoor:true, meals:false,
      waitlist:"Low", waitlist_months:2, stability:4, staff_concern:"High",
      chain:"Independent", sessional:true,
      notes:"Sessional Montessori in community centre. ECCE-only model at risk." },

    { id:10, name:"Lucan Childcare Crèche and Montessori", type:"Full Day Crèche & Montessori", typeKey:"creche",
      address:"33 Willsbrook Avenue, Lucan", eircode:"K78",
      lat:53.3570, lng:-6.4400, phone:"Tusla register", website:"",
      hours:"7:30–18:00 Mon–Fri (est.)", age_range:"1–5 yrs",
      monthly_fee:1050, post_universal:632, weekly:240, ecce:true, core_funding:true,
      montessori:true, outdoor:true, meals:true,
      waitlist:"Medium", waitlist_months:4, stability:5, staff_concern:"High",
      chain:"Independent",
      notes:"Listed on Tusla register. Independent Montessori crèche." },

    { id:11, name:"Caroline Ogundimu (Childminder)", type:"Tusla Registered Childminder", typeKey:"childminder",
      address:"3 Oldbridge Park, Lucan", eircode:"K78",
      lat:53.3540, lng:-6.4460, phone:"085 107 5339", website:"",
      hours:"Flexible", age_range:"0–14 yrs",
      monthly_fee:850, post_universal:432, weekly:200, ecce:false, core_funding:false,
      montessori:false, outdoor:true, meals:true,
      waitlist:"Low", waitlist_months:1, stability:6, staff_concern:"Low",
      chain:"Independent Childminder",
      notes:"Tusla registered Dec 2025. Max 6 children. NCS subsidies apply." },

    { id:12, name:"Lynne's Little Ones (Childminder)", type:"Tusla Registered Childminder", typeKey:"childminder",
      address:"20 Oldbridge View, Lucan", eircode:"K78",
      lat:53.3538, lng:-6.4470, phone:"087 626 0360", website:"",
      hours:"Flexible", age_range:"0–14 yrs",
      monthly_fee:850, post_universal:432, weekly:200, ecce:false, core_funding:false,
      montessori:false, outdoor:true, meals:true,
      waitlist:"Low", waitlist_months:1, stability:6, staff_concern:"Low",
      chain:"Independent Childminder",
      notes:"Tusla registered July 2025. Max 6 children." },

    { id:13, name:"Mridul Sharma (Childminder)", type:"Tusla Registered Childminder", typeKey:"childminder",
      address:"4 Griffeen Glen Drive, Lucan", eircode:"K78",
      lat:53.3520, lng:-6.4380, phone:"(01) 503 0615", website:"",
      hours:"Flexible", age_range:"2–6 yrs",
      monthly_fee:800, post_universal:382, weekly:185, ecce:false, core_funding:false,
      montessori:false, outdoor:true, meals:true,
      waitlist:"Low", waitlist_months:1, stability:6, staff_concern:"Low",
      chain:"Independent Childminder",
      notes:"Tusla registered Aug 2023. Preschool-age focus (2–6). Max 6." },

    { id:14, name:"Tigers Childcare (Castleknock)", type:"Full Day Crèche & Preschool", typeKey:"creche",
      address:"Castleknock, Dublin 15", eircode:"D15",
      lat:53.3712, lng:-6.3780, phone:"via Tigers site", website:"https://tigerschildcare.com",
      hours:"7:30–18:30 Mon–Fri", age_range:"6 months – 12 yrs",
      monthly_fee:1070, post_universal:652, weekly:252, ecce:true, core_funding:true,
      montessori:false, outdoor:true, meals:true,
      waitlist:"High", waitlist_months:6, stability:7, staff_concern:"Medium",
      chain:"Tigers Childcare (national chain)",
      notes:"Nearest Tigers to Lucan (15–20 min drive). Structured curriculum." }
  ]
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

// ============================================================
// 1) LEAFLET MAP
// ============================================================
let map, markerLayer;

function buildMap(){
  map = L.map("leaflet-map", {
    center: [DATA.metadata.center.lat, DATA.metadata.center.lng],
    zoom: 13,
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
  const feeLine = p.sessional
    ? `<strong>${fmtEUR(p.weekly)}/wk</strong> (sessional, free under ECCE)`
    : `<strong>${fmtEUR(p.monthly_fee)}/mo</strong> pre-subsidy`;
  return `
    <div class="pop">
      <div class="pop__title">${p.name}</div>
      <div class="pop__type">${p.type}</div>
      <div class="pop__row"><span>Fee</span>${feeLine}</div>
      <div class="pop__row"><span>Hours</span><strong>${p.hours}</strong></div>
      <div class="pop__row"><span>Ages</span><strong>${p.age_range}</strong></div>
      <div class="pop__row"><span>Waitlist</span><strong>${p.waitlist} (~${p.waitlist_months} mo)</strong></div>
      <div class="pop__row"><span>Stability</span><strong>${p.stability}/10</strong></div>
    </div>`;
}

function renderMarkers(list){
  markerLayer.clearLayers();
  list.forEach(p => {
    const m = L.marker([p.lat, p.lng], { icon: makeIcon(p.waitlist) });
    m.bindPopup(popupHTML(p), { maxWidth: 280 });
    m.addTo(markerLayer);
  });
  $("#map-count").textContent = list.length;
}

// ---------- Map filters ----------
function applyMapFilters(){
  const type = $("#f-type").value;
  const budget = parseInt($("#f-budget").value, 10);
  const mont = $("#f-mont").checked;
  const ecce = $("#f-ecce").checked;
  $("#f-budget-val").textContent = fmtEUR(budget);

  const filtered = DATA.providers.filter(p => {
    if (type !== "all" && p.typeKey !== type) return false;
    // Use sessional weekly × 4.33 for budget check, else monthly
    const monthly = p.sessional ? Math.round(p.weekly * 4.33) : p.monthly_fee;
    if (monthly > budget) return false;
    if (mont && !p.montessori) return false;
    if (ecce && !p.ecce) return false;
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

function providerCardHTML(p){
  const feeLabel = p.sessional
    ? `<strong>${fmtEUR(p.weekly)}</strong><span>/week sessional · free via ECCE</span>`
    : `<strong>${fmtEUR(p.monthly_fee)}</strong><span>/month · pre-subsidy</span>`;
  const stabPct = p.stability * 10;
  const feats = [];
  if (p.montessori) feats.push(`<span class="feat">${FEAT_ICONS.mont} Montessori</span>`);
  if (p.meals)      feats.push(`<span class="feat">${FEAT_ICONS.meals} Meals</span>`);
  if (p.outdoor)    feats.push(`<span class="feat">${FEAT_ICONS.out} Outdoor</span>`);
  if (p.ecce)       feats.push(`<span class="feat">${FEAT_ICONS.ecce} ECCE</span>`);

  const link = p.website
    ? `<a href="${p.website}" target="_blank" rel="noopener" class="pcard__link">Visit website →</a>`
    : `<span class="pcard__link" style="color:var(--muted)">Contact via Tusla register</span>`;

  return `
    <article class="pcard" data-id="${p.id}">
      <header class="pcard__head">
        <span class="pcard__type">${p.type}</span>
        <h3 class="pcard__name">${p.name}</h3>
      </header>
      <div class="pcard__fee">${feeLabel}</div>
      <div class="pcard__meta">
        <span><b>Hours</b><br/>${p.hours}</span>
        <span><b>Ages</b><br/>${p.age_range}</span>
        <span><b>Area</b><br/>${p.address.split(",")[0]}</span>
        <span><b>Chain</b><br/>${p.chain}</span>
      </div>
      <div class="pcard__badges">
        <span class="${riskBadgeClass(p.waitlist)}">Waitlist: ${p.waitlist} · ~${p.waitlist_months} mo</span>
      </div>
      <div class="pcard__stability">
        Stability ${p.stability}/10
        <div class="stability-bar"><div class="stability-bar__fill" style="width:${stabPct}%"></div></div>
      </div>
      <div class="pcard__features">${feats.join("")}</div>
      ${link}
    </article>`;
}

function renderProviders(){
  const q = $("#p-search").value.trim().toLowerCase();
  const sort = $("#p-sort").value;
  let list = DATA.providers.slice();

  if (q){
    list = list.filter(p =>
      [p.name, p.type, p.address, p.chain, p.notes].join(" ").toLowerCase().includes(q)
    );
  }
  const waitOrder = { "Low":1, "Medium":2, "High":3, "Very High":4 };
  const sortFns = {
    "price":      (a,b) => a.monthly_fee - b.monthly_fee,
    "price-desc": (a,b) => b.monthly_fee - a.monthly_fee,
    "stability":  (a,b) => b.stability - a.stability,
    "waitlist":   (a,b) => waitOrder[a.waitlist] - waitOrder[b.waitlist],
    "name":       (a,b) => a.name.localeCompare(b.name)
  };
  list.sort(sortFns[sort]);
  $("#provider-grid").innerHTML = list.map(providerCardHTML).join("");
}

// ============================================================
// 3) COST SIMULATOR
// ============================================================
/*
  Subsidy model (simplified but faithful to scheme mechanics):
  - NCS Universal: €2.14 / hour, capped 45 hrs/wk. We use per-child hours.
  - Hours/wk estimated: full day 45h; sessional 15h.
  - NCS Income-Assessed (extra on top of universal, simplified scale):
      income < €26,000  → +€3.00/hr   (approx full enhanced)
      €26k–€60k         → linear taper from €3.00 → €0.00/hr
      > €60k            → €0
  - ECCE: when toggled and age=preschool, remove 3h/day × 5d × 38/52 of weekly hours as "free",
    effectively reducing gross proportionally over a school-year basis.
  - Annual = net monthly × 12.
*/

const SIM = {
  income: 50000, kids: 1, days: 5, age: "toddler", ecce: false, providerId: 1
};

function hourlyRate(p){
  // derive hourly rate from monthly fee / monthly hours
  const weeklyHours = p.sessional ? 15 : 45;
  if (p.sessional) return (p.weekly / 15) || 0;
  // monthly ≈ weekly × 4.33
  const weekly = p.weekly || (p.monthly_fee / 4.33);
  return weekly / weeklyHours;
}

function incomeAssessedRate(income){
  if (income < 26000) return 3.0;
  if (income >= 60000) return 0;
  // linear taper
  const frac = (income - 26000) / (60000 - 26000);
  return 3.0 * (1 - frac);
}
function incomeAssessedRate2026(income, kids){
  const FULL = 34000 + Math.max(0, kids - 1) * 11000;
  const MAX  = 68000 + Math.max(0, kids - 1) * 11000;
  if (income < FULL) return 3.0;
  if (income >= MAX) return 0;
  const frac = (income - FULL) / (MAX - FULL);
  return 3.0 * (1 - frac);
}

function compute({ income, kids, days, age, ecce, providerId, rule2026=false }){
  const p = DATA.providers.find(x => x.id === providerId) || DATA.providers[0];

  const isSessional = !!p.sessional;
  const hoursPerDay = isSessional ? 3 : 9;
  const weeklyHours = Math.min(45, days * hoursPerDay);

  // Gross: scale provider's monthly fee (5 days) by days/5
  let grossMonthly;
  if (isSessional){
    grossMonthly = p.weekly * (days / 5) * 4.33;
  } else {
    grossMonthly = p.monthly_fee * (days / 5);
  }

  // NCS Universal: €2.14/hr × weekly hours × 4.33
  const ncsU_hourly = 2.14;
  const ncsU_weekly = Math.min(ncsU_hourly * weeklyHours, 96.30);
  const ncsU_monthly = ncsU_weekly * 4.33;

  // NCS Income-Assessed (extra hourly on top of universal)
  const ncsI_hourly = rule2026
    ? incomeAssessedRate2026(income, kids)
    : incomeAssessedRate(income);
  const ncsI_weekly = ncsI_hourly * weeklyHours;
  const ncsI_monthly = ncsI_weekly * 4.33;

  // ECCE: if toggled + preschool + provider participates
  // Worth = capitation €69-82/wk for 38 wks ≈ €75 × 38 / 12 = ~€237/mo average
  let ecceSaving = 0;
  if (ecce && age === "preschool" && p.ecce){
    if (isSessional){
      // ECCE covers the full sessional portion free (3h/day × 5d)
      ecceSaving = Math.min(grossMonthly, 75 * 38 / 12);
    } else {
      // Removes 3h/day × 5d = 15h/week from the billable portion
      // worth approximately hourly rate × 15 × 4.33 × (38/52), during school year
      const rate = hourlyRate(p);
      ecceSaving = rate * 15 * 4.33 * (38 / 52);
    }
  }

  // Apply subsidies in order (can't go below 0)
  let net = grossMonthly;
  const appliedU = Math.min(ncsU_monthly, net); net -= appliedU;
  const appliedI = Math.min(ncsI_monthly, net); net -= appliedI;
  const appliedE = Math.min(ecceSaving, net);   net -= appliedE;

  // Multi-child: we report per-child figures but allow kid count for 2026 thresholds.
  const monthlyIncome = income / 12;
  const pctIncome = monthlyIncome > 0 ? (net / monthlyIncome) * 100 : 0;

  return {
    gross: grossMonthly,
    ncsU: appliedU,
    ncsI: appliedI,
    ecce: appliedE,
    net,
    annual: net * 12,
    pctIncome,
    provider: p
  };
}

function renderSim(){
  const r = compute(SIM);

  $("#o-gross").textContent = fmtEUR(r.gross);
  $("#o-ncsu").textContent  = "−" + fmtEUR(r.ncsU);
  $("#o-ncsi").textContent  = "−" + fmtEUR(r.ncsI);
  $("#o-ecce").textContent  = "−" + fmtEUR(r.ecce);
  $("#o-net").textContent   = fmtEUR(r.net);
  $("#o-pct").textContent   = r.pctIncome.toFixed(1) + "% of monthly household income";
  $("#o-annual").textContent= fmtEUR(r.annual) + " per year";

  // Bars: scale all to gross
  const maxG = Math.max(r.gross, 1);
  const midVal = r.gross - r.ncsU;
  $("#bar-gross").style.width = "100%";
  $("#bar-gross-val").textContent = fmtEUR(r.gross);
  $("#bar-mid").style.width   = Math.max(0, (midVal / maxG) * 100) + "%";
  $("#bar-mid-val").textContent   = fmtEUR(midVal);
  $("#bar-net").style.width   = Math.max(0, (r.net / maxG) * 100) + "%";
  $("#bar-net-val").textContent   = fmtEUR(r.net);

  renderScenarios(r);
}

function renderScenarios(base){
  const baseNet = base.net;
  const scenarios = [];

  // Scenario A: Parent cuts to 3 days
  const sA = compute({ ...SIM, days: 3 });
  scenarios.push({
    tag: "Work change",
    title: "Parent cuts to 3 days/week",
    net: sA.net, base: baseNet,
    note: `Gross drops to ${fmtEUR(sA.gross)}. Universal NCS scales with hours.`
  });

  // Scenario B: Income drops below €34k
  const sB = compute({ ...SIM, income: 30000 });
  scenarios.push({
    tag: "Income drop",
    title: "Household income falls to €30k",
    net: sB.net, base: baseNet,
    note: `Full income-assessed NCS kicks in. Deeper subsidy per hour.`
  });

  // Scenario C: Sept 2026 rule change
  const sC = compute({ ...SIM, rule2026: true });
  scenarios.push({
    tag: "Policy shift",
    title: "September 2026 NCS thresholds",
    net: sC.net, base: baseNet,
    note: `Full subsidy &lt; €34k, graduated to €68k. +€11k per extra child.`
  });

  const html = scenarios.map(s => {
    const delta = s.net - s.base;
    const deltaCls = delta < 0 ? "delta--down" : delta > 0 ? "delta--up" : "";
    const arrow = delta < 0 ? "▼" : delta > 0 ? "▲" : "·";
    return `
      <div class="scenario">
        <span class="scenario__tag">${s.tag}</span>
        <h4 class="scenario__title">${s.title}</h4>
        <div class="scenario__net">${fmtEUR(s.net)}<span class="scenario__delta ${deltaCls}"> ${arrow} ${fmtEUR(Math.abs(delta))}/mo</span></div>
        <p class="scenario__note">${s.note}</p>
      </div>`;
  }).join("");
  $("#scenarios-grid").innerHTML = html;
}

function wireSim(){
  // Populate provider dropdown
  const opts = DATA.providers.map(p =>
    `<option value="${p.id}">${p.name}${p.sessional ? " (sessional)" : ""}: ${fmtEUR(p.monthly_fee)}/mo</option>`
  ).join("");
  $("#s-prov").innerHTML = opts;

  const income = $("#s-income"), kids = $("#s-kids"), days = $("#s-days"),
        age = $("#s-age"), ecce = $("#s-ecce"), prov = $("#s-prov");

  const sync = () => {
    SIM.income = parseInt(income.value, 10);
    SIM.kids   = parseInt(kids.value, 10);
    SIM.days   = parseInt(days.value, 10);
    SIM.age    = age.value;
    SIM.ecce   = ecce.checked;
    SIM.providerId = parseInt(prov.value, 10);
    $("#s-income-val").textContent = fmtEUR(SIM.income);
    $("#s-kids-val").textContent = SIM.kids;
    $("#s-days-val").textContent = SIM.days;
    renderSim();
  };

  [income, kids, days].forEach(el => el.addEventListener("input", sync));
  [age, ecce, prov].forEach(el => el.addEventListener("change", sync));
  sync();
}

// ============================================================
// 4) PROVIDER CHECKLIST
// ============================================================
function computeChecklist(p){
  // Build a list of constructive questions to ask the provider
  const questions = [];
  let questionLevel, levelCls, gaugeCls;

  if (p.stability <= 4){ questions.push("Ask about their long-term plans and sustainability"); }
  else if (p.stability <= 6){ questions.push("Ask how they manage staffing and capacity"); }

  if (p.sessional){ questions.push("Ask how they sustain sessional-only hours"); }
  if (p.chain.toLowerCase().includes("independent") && !p.sessional){
    questions.push("Ask about backup if their capacity fills up");
  }
  if (!p.core_funding){ questions.push("Ask if they plan to join Core Funding"); }
  if (p.staff_concern === "High"){ questions.push("Ask about staff retention and ratios"); }
  else if (p.staff_concern === "Medium"){ questions.push("Ask about staff experience and turnover"); }

  if (p.chain.toLowerCase().includes("national chain") || p.chain.includes("20+") || p.chain.includes("14")){
    questions.push("Ask how their chain support works");
  }

  // Categorise by how many questions apply
  if (questions.length <= 1){
    questionLevel = "Standard checks"; levelCls = "low"; gaugeCls = "good";
  } else if (questions.length <= 3){
    questionLevel = "Worth asking about"; levelCls = "med"; gaugeCls = "mid";
  } else {
    questionLevel = "Ask these questions"; levelCls = "high"; gaugeCls = "bad";
  }

  // Stability gauge fills by stability score
  const pct = Math.max(10, Math.min(100, p.stability * 10));

  // Build a conversation starter based on the provider's profile
  let starter;
  if (questions.length <= 1){
    starter = "Strong signals overall. Still worth asking about staff ratios, daily routine, and how they communicate with parents.";
  } else if (questions.length <= 3){
    starter = "Good to raise these topics on your visit. Ask the manager directly, and confirm their Tusla registration and Core Funding status.";
  } else {
    starter = "These questions are especially relevant for this type of provider. Ask the manager, and consider having a backup on your waitlist while you decide.";
  }

  return { questionLevel, levelCls, gaugeCls, questions, starter, pct };
}

function stressCardHTML(p){
  const r = computeChecklist(p);
  return `
    <article class="scard">
      <header class="scard__head">
        <div>
          <div class="scard__name">${p.name}</div>
          <div style="font-size:var(--fs-xs); color:var(--muted); margin-top:2px;">${p.type}</div>
        </div>
        <span class="scard__risk scard__risk--${r.levelCls}">${r.questionLevel}</span>
      </header>
      <div>
        <div style="font-size:var(--fs-xs); color:var(--muted); margin-bottom:5px;">Stability score</div>
        <div class="gauge">
          <div class="gauge__track"><div class="gauge__fill gauge__fill--${r.gaugeCls}" style="width:${r.pct}%"></div></div>
          <span class="gauge__val">${p.stability}/10</span>
        </div>
      </div>
      <div>
        <div style="font-size:var(--fs-xs); color:var(--muted); margin-bottom:6px;">Questions to ask</div>
        <div class="risk-tags">
          ${r.questions.length ? r.questions.map(q => `<span class="risk-tag">${q}</span>`).join("") : `<span class="risk-tag">Standard checks apply</span>`}
        </div>
      </div>
      <p class="scard__reco">${r.starter}</p>
    </article>`;
}

function renderStress(){
  // Sort by question level then stability
  const sorted = DATA.providers.slice().sort((a,b) => {
    const ra = computeChecklist(a), rb = computeChecklist(b);
    const order = { "Standard checks": 1, "Worth asking about": 2, "Ask these questions": 3 };
    return order[ra.questionLevel] - order[rb.questionLevel] || b.stability - a.stability;
  });
  $("#stress-grid").innerHTML = sorted.map(stressCardHTML).join("");
}

// ============================================================
// INIT
// ============================================================
function init(){
  // Map
  buildMap();
  $("#f-type").addEventListener("change", applyMapFilters);
  $("#f-budget").addEventListener("input", applyMapFilters);
  $("#f-mont").addEventListener("change", applyMapFilters);
  $("#f-ecce").addEventListener("change", applyMapFilters);

  // Providers
  renderProviders();
  $("#p-search").addEventListener("input", renderProviders);
  $("#p-sort").addEventListener("change", renderProviders);

  // Simulator
  wireSim();

  // Stress test
  renderStress();
}

if (document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
