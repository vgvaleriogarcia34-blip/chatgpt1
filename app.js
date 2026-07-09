/* =========================================================================
   RefCalc — Calculador de ciclo de refrigeración por compresión de vapor
   Motor termodinámico basado en correlaciones de estados correspondientes.
   ========================================================================= */

'use strict';

const RGAS = 8.314462;          // J/mol·K
const T0K  = 273.15;            // 0 °C en K
// Referencia IIR: líquido saturado a 0 °C -> h = 200 kJ/kg, s = 1,00 kJ/kg·K
const H_REF = 200.0;
const S_REF = 1.00;

/* ---- Base de datos de refrigerantes -----------------------------------
   M   = masa molar (g/mol)
   Tc  = temperatura crítica (K)
   Pc  = presión crítica (kPa)
   omega = factor acéntrico
   cpl = cp líquido (kJ/kg·K)     cpv = cp vapor ideal (kJ/kg·K)
------------------------------------------------------------------------ */
const REFRIGERANTS = {
  R134a:  { name:'R-134a (HFC)',            M:102.03, Tc:374.21, Pc:4059.3,  omega:0.32684, cpl:1.34, cpv:0.90 },
  R290:   { name:'R-290 · Propano',         M:44.096, Tc:369.89, Pc:4251.2,  omega:0.15210, cpl:2.68, cpv:1.67 },
  R600a:  { name:'R-600a · Isobutano',      M:58.122, Tc:407.81, Pc:3629.0,  omega:0.18400, cpl:2.40, cpv:1.70 },
  R1270:  { name:'R-1270 · Propileno',      M:42.080, Tc:364.21, Pc:4555.0,  omega:0.14600, cpl:2.55, cpv:1.55 },
  R717:   { name:'R-717 · Amoníaco (NH₃)',  M:17.030, Tc:405.40, Pc:11333.0, omega:0.25600, cpl:4.70, cpv:2.20 },
  R744:   { name:'R-744 · CO₂',             M:44.010, Tc:304.13, Pc:7377.0,  omega:0.22394, cpl:2.50, cpv:0.85 },
  R410A:  { name:'R-410A (HFC blend)',      M:72.580, Tc:344.50, Pc:4901.0,  omega:0.29600, cpl:1.75, cpv:0.90 },
  R404A:  { name:'R-404A (HFC blend)',      M:97.600, Tc:345.20, Pc:3735.0,  omega:0.29300, cpl:1.60, cpv:0.88 },
  R407C:  { name:'R-407C (HFC blend)',      M:86.200, Tc:359.30, Pc:4630.0,  omega:0.28600, cpl:1.55, cpv:0.86 },
  R32:    { name:'R-32 (HFC)',              M:52.024, Tc:351.26, Pc:5782.0,  omega:0.27690, cpl:1.90, cpv:0.85 },
  R22:    { name:'R-22 (HCFC)',             M:86.468, Tc:369.30, Pc:4990.0,  omega:0.22082, cpl:1.26, cpv:0.66 },
  R507A:  { name:'R-507A (HFC blend)',      M:98.860, Tc:343.77, Pc:3705.0,  omega:0.29300, cpl:1.60, cpv:0.88 },
  R1234yf:{ name:'R-1234yf (HFO)',          M:114.04, Tc:367.85, Pc:3382.0,  omega:0.27600, cpl:1.34, cpv:0.92 },
  R1234ze:{ name:'R-1234ze(E) (HFO)',       M:114.04, Tc:382.52, Pc:3636.0,  omega:0.31300, cpl:1.30, cpv:0.90 },
  R152a:  { name:'R-152a (HFC)',            M:66.051, Tc:386.41, Pc:4516.8,  omega:0.27521, cpl:1.65, cpv:1.00 },
  R123:   { name:'R-123 (HCFC)',            M:152.93, Tc:456.83, Pc:3668.0,  omega:0.28192, cpl:1.02, cpv:0.68 },
};

/* ---- Propiedades termodinámicas ---------------------------------------- */

// Presión de saturación (kPa) — correlación de Lee–Kesler
function pSat(r, T) {
  const Tr = T / r.Tc;
  if (Tr >= 1) return NaN;
  const f0 = 5.92714 - 6.09648 / Tr - 1.28862 * Math.log(Tr) + 0.169347 * Math.pow(Tr, 6);
  const f1 = 15.2518 - 15.6875 / Tr - 13.4721 * Math.log(Tr) + 0.43577 * Math.pow(Tr, 6);
  return r.Pc * Math.exp(f0 + r.omega * f1);
}

// Temperatura de saturación (K) para una presión dada (kPa) — inversión numérica
function tSat(r, P) {
  let lo = 150, hi = r.Tc - 0.01;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    (pSat(r, mid) < P) ? (lo = mid) : (hi = mid);
  }
  return 0.5 * (lo + hi);
}

// Calor latente de vaporización (kJ/kg) — Pitzer / Carruth–Kobayashi
function hVap(r, T) {
  const Tr = T / r.Tc;
  if (Tr >= 1) return 0;
  const t = 1 - Tr;
  const dH = RGAS * r.Tc * (7.08 * Math.pow(t, 0.354) + 10.95 * r.omega * Math.pow(t, 0.456)); // J/mol
  return dH / r.M; // kJ/kg
}

// Constante específica del gas (kJ/kg·K)
function Rspec(r) { return RGAS / r.M; }

// Entalpía / entropía de líquido saturado a T (K)
function hLiqSat(r, T) { return H_REF + r.cpl * (T - T0K); }
function sLiqSat(r, T) { return S_REF + r.cpl * Math.log(T / T0K); }

// Entalpía / entropía de vapor saturado a T (K)
function hVapSat(r, T) { return hLiqSat(r, T) + hVap(r, T); }
function sVapSat(r, T) { return sLiqSat(r, T) + hVap(r, T) / T; }

// Volumen específico del vapor (m³/kg) — gas ideal con factor de compresibilidad estimado
function vVapor(r, T, P_kPa) {
  const Z = 0.95; // corrección media respecto a gas ideal para vapor cercano a saturación
  return Z * Rspec(r) * T / P_kPa; // (kJ/kg·K)*(K)/(kPa) = m³/kg
}

/* ---- Cálculo del ciclo ------------------------------------------------- */
function computeCycle(key, inp) {
  const r = REFRIGERANTS[key];
  const Te = inp.tEvap + T0K;
  const Tc = inp.tCond + T0K;

  const warnings = [];
  if (Tc >= r.Tc) {
    return { error: `La temperatura de condensación (${inp.tCond} °C) supera la crítica del ` +
      `refrigerante (${(r.Tc - T0K).toFixed(1)} °C). Régimen transcrítico no soportado.` };
  }
  if (Te >= Tc) return { error: 'La temperatura de evaporación debe ser menor que la de condensación.' };
  if (Te >= r.Tc) return { error: 'Temperatura de evaporación fuera de rango (supera la crítica).' };

  const Pe = pSat(r, Te);   // kPa
  const Pc = pSat(r, Tc);   // kPa

  // --- Punto 1: salida del evaporador (vapor recalentado a Pe) ---
  const T1 = Te + inp.superheat;
  const h1 = hVapSat(r, Te) + r.cpv * inp.superheat;
  const s1 = sVapSat(r, Te) + r.cpv * Math.log(T1 / Te);
  const v1 = vVapor(r, T1, Pe);

  // --- Punto 2: descarga del compresor (a Pc) ---
  // Compresión isentrópica: s2s = s1
  const T2s = Tc * Math.exp((s1 - sVapSat(r, Tc)) / r.cpv);
  const h2s = hVapSat(r, Tc) + r.cpv * (T2s - Tc);
  const eta = inp.etaIsen / 100;
  const h2  = h1 + (h2s - h1) / eta;
  const T2  = Tc + (h2 - hVapSat(r, Tc)) / r.cpv;
  const s2  = sVapSat(r, Tc) + r.cpv * Math.log(T2 / Tc);

  // --- Punto 3: salida del condensador (líquido subenfriado a Pc) ---
  const T3 = Tc - inp.subcool;
  const h3 = hLiqSat(r, T3);
  const s3 = sLiqSat(r, T3);

  // --- Punto 4: tras válvula de expansión (isentálpico, a Pe) ---
  const h4 = h3;
  const hf4 = hLiqSat(r, Te), hg4 = hVapSat(r, Te);
  const x4 = (h4 - hf4) / (hg4 - hf4);
  const sf4 = sLiqSat(r, Te), sg4 = sVapSat(r, Te);
  const s4 = sf4 + x4 * (sg4 - sf4);

  // --- Prestaciones ---
  const qe = h1 - h4;          // efecto refrigerante (kJ/kg)
  const w  = h2 - h1;          // trabajo de compresión (kJ/kg)
  const qc = h2 - h3;          // calor rechazado (kJ/kg)
  const cop = qe / w;          // COP frigorífico
  const mdot = qe > 0 ? inp.capacity / qe : NaN;   // kg/s   (Q0 en kW)
  const power = mdot * w;      // kW
  const heatRej = mdot * qc;   // kW
  const volFlow = mdot * v1;   // m³/s
  const volCap = qe / v1;      // capacidad volumétrica (kJ/m³)
  const prat = Pc / Pe;

  if (T2 - T0K > 130) warnings.push(`Temperatura de descarga elevada (${(T2 - T0K).toFixed(0)} °C): revisar recalentamiento / relación de compresión.`);
  if (x4 > 0.5) warnings.push(`Título de vapor tras expansión alto (x=${x4.toFixed(2)}): bajo efecto refrigerante.`);

  return {
    r, Pe, Pc,
    states: [
      { id:'1', desc:'Salida evaporador (vapor recal.)', P:Pe, T:T1, h:h1, s:s1 },
      { id:'2', desc:'Descarga compresor',               P:Pc, T:T2, h:h2, s:s2 },
      { id:'3', desc:'Salida condensador (líq. subenf.)', P:Pc, T:T3, h:h3, s:s3 },
      { id:'4', desc:'Salida válvula expansión',          P:Pe, T:Te,  h:h4, s:s4, x:x4 },
    ],
    perf: { qe, w, qc, cop, mdot, power, heatRej, volFlow, volCap, prat, T2, T2s, x4, h2s },
    warnings,
  };
}

/* ---- Interfaz de usuario ----------------------------------------------- */
const $ = id => document.getElementById(id);

function initRefSelect() {
  const sel = $('refSelect');
  for (const [key, r] of Object.entries(REFRIGERANTS)) {
    const opt = document.createElement('option');
    opt.value = key; opt.textContent = r.name;
    sel.appendChild(opt);
  }
  sel.value = 'R134a';
  sel.addEventListener('change', () => { updateRefMeta(); calculate(); });
  updateRefMeta();
}

function updateRefMeta() {
  const r = REFRIGERANTS[$('refSelect').value];
  $('refMeta').innerHTML =
    `M = ${r.M} g/mol · T<sub>crít</sub> = ${(r.Tc - T0K).toFixed(1)} °C · ` +
    `p<sub>crít</sub> = ${(r.Pc / 100).toFixed(1)} bar`;
}

function readInputs() {
  return {
    tEvap:     parseFloat($('tEvap').value),
    tCond:     parseFloat($('tCond').value),
    superheat: Math.max(0, parseFloat($('superheat').value) || 0),
    subcool:   Math.max(0, parseFloat($('subcool').value) || 0),
    etaIsen:   Math.min(100, Math.max(10, parseFloat($('etaIsen').value) || 70)),
    capacity:  Math.max(0, parseFloat($('capacity').value) || 0),
  };
}

function fmt(x, d = 2) {
  return (isFinite(x) ? x : NaN).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function calculate() {
  const key = $('refSelect').value;
  const inp = readInputs();
  const res = computeCycle(key, inp);
  const warnBox = $('warnBox');

  if (res.error) {
    warnBox.textContent = '⚠ ' + res.error;
    warnBox.className = 'warn error';
    $('kpiGrid').innerHTML = '';
    $('stateTable').querySelector('tbody').innerHTML = '';
    clearCanvas();
    return;
  }

  warnBox.className = 'warn';
  warnBox.innerHTML = res.warnings.length ? res.warnings.map(w => '⚠ ' + w).join('<br>') : '';

  renderKPIs(res.perf, inp);
  renderStates(res.states);
  drawPHDiagram(res);
}

function renderKPIs(p, inp) {
  const items = [
    { label: 'COP frigorífico',            val: fmt(p.cop, 2),                   unit: '' },
    { label: 'Efecto refrigerante',        val: fmt(p.qe, 1),                    unit: 'kJ/kg' },
    { label: 'Trabajo compresión',         val: fmt(p.w, 1),                     unit: 'kJ/kg' },
    { label: 'Calor rechazado',            val: fmt(p.heatRej, 2),               unit: 'kW' },
    { label: 'Caudal másico',              val: fmt(p.mdot * 1000, 1),           unit: 'g/s' },
    { label: 'Potencia compresor',         val: fmt(p.power, 2),                 unit: 'kW' },
    { label: 'Caudal volumétrico asp.',    val: fmt(p.volFlow * 3600, 2),        unit: 'm³/h' },
    { label: 'Capacidad volumétrica',      val: fmt(p.volCap, 0),                unit: 'kJ/m³' },
    { label: 'Relación de compresión',     val: fmt(p.prat, 2),                  unit: '' },
    { label: 'Temp. descarga',             val: fmt(p.T2 - T0K, 1),              unit: '°C' },
    { label: 'Título tras expansión',      val: fmt(p.x4 * 100, 1),              unit: '%' },
    { label: 'Capacidad frigorífica',      val: fmt(inp.capacity, 2),            unit: 'kW' },
  ];
  $('kpiGrid').innerHTML = items.map(i =>
    `<div class="kpi"><span class="kpi-val">${i.val}<em>${i.unit}</em></span>
     <span class="kpi-lab">${i.label}</span></div>`).join('');
}

function renderStates(states) {
  const tb = $('stateTable').querySelector('tbody');
  tb.innerHTML = states.map(s => {
    const extra = s.x !== undefined ? ` <span class="x-badge">x=${(s.x * 100).toFixed(0)}%</span>` : '';
    return `<tr>
      <td class="pt-id">${s.id}</td>
      <td>${s.desc}${extra}</td>
      <td>${fmt(s.P / 100, 2)}</td>
      <td>${fmt(s.T - T0K, 1)}</td>
      <td>${fmt(s.h, 1)}</td>
      <td>${fmt(s.s, 4)}</td>
    </tr>`;
  }).join('');
}

/* ---- Diagrama p–h ------------------------------------------------------ */
function clearCanvas() {
  const c = $('phCanvas'), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
}

function drawPHDiagram(res) {
  const c = $('phCanvas'), ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);

  const r = res.r;
  const pad = { l: 62, r: 20, t: 24, b: 46 };

  // Curva de saturación
  const dome = [];
  const Tmin = Math.max(160, r.Tc - 200);
  const Tmax = r.Tc - 0.5;
  for (let T = Tmin; T <= Tmax; T += 1) dome.push({ h: hLiqSat(r, T), P: pSat(r, T) });
  const domeV = [];
  for (let T = Tmax; T >= Tmin; T -= 1) domeV.push({ h: hVapSat(r, T), P: pSat(r, T) });
  const full = dome.concat(domeV);

  // Rango de ejes (incluye ciclo)
  let hmin = Infinity, hmax = -Infinity, pmin = Infinity, pmax = -Infinity;
  const allPts = full.concat(res.states.map(s => ({ h: s.h, P: s.P })));
  allPts.push({ h: res.perf.h2s, P: res.Pc });
  for (const pt of allPts) {
    if (!isFinite(pt.h) || !isFinite(pt.P) || pt.P <= 0) continue;
    hmin = Math.min(hmin, pt.h); hmax = Math.max(hmax, pt.h);
    pmin = Math.min(pmin, pt.P); pmax = Math.max(pmax, pt.P);
  }
  const hSpan = hmax - hmin;
  hmin -= hSpan * 0.06; hmax += hSpan * 0.10;
  const lpmin = Math.log10(pmin * 0.7), lpmax = Math.log10(pmax * 1.4);

  const X = h => pad.l + (h - hmin) / (hmax - hmin) * (W - pad.l - pad.r);
  const Y = P => pad.t + (lpmax - Math.log10(P)) / (lpmax - lpmin) * (H - pad.t - pad.b);

  // Rejilla horizontal (presión, escala log en bar)
  ctx.strokeStyle = '#e6ebf2'; ctx.fillStyle = '#8a97a8';
  ctx.font = '11px Inter, sans-serif'; ctx.lineWidth = 1;
  const decLo = Math.floor(lpmin), decHi = Math.ceil(lpmax);
  for (let d = decLo; d <= decHi; d++) {
    for (const m of [1, 2, 5]) {
      const Pk = m * Math.pow(10, d);        // kPa
      const lp = Math.log10(Pk);
      if (lp < lpmin || lp > lpmax) continue;
      const y = Y(Pk);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillText((Pk / 100).toFixed(Pk < 100 ? 2 : (Pk < 1000 ? 1 : 0)), 6, y + 3);
    }
  }
  // Rejilla vertical (entalpía)
  const hStep = niceStep((hmax - hmin) / 6);
  for (let h = Math.ceil(hmin / hStep) * hStep; h <= hmax; h += hStep) {
    const x = X(h);
    ctx.strokeStyle = '#eef2f7';
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, H - pad.b); ctx.stroke();
    ctx.fillStyle = '#8a97a8';
    ctx.fillText(h.toFixed(0), x - 10, H - pad.b + 16);
  }
  // Etiquetas de ejes
  ctx.fillStyle = '#5b6675'; ctx.font = '12px Inter, sans-serif';
  ctx.fillText('Entalpía h (kJ/kg)', W / 2 - 50, H - 8);
  ctx.save(); ctx.translate(14, H / 2 + 40); ctx.rotate(-Math.PI / 2);
  ctx.fillText('Presión p (bar) — escala log', 0, 0); ctx.restore();

  // Curva de saturación
  ctx.strokeStyle = '#1f6feb'; ctx.lineWidth = 2; ctx.beginPath();
  full.forEach((pt, i) => { const x = X(pt.h), y = Y(pt.P); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.stroke();

  // Ciclo 1-2-3-4-1
  const S = res.states;
  const order = [S[0], S[1], S[2], S[3], S[0]];
  ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2.4; ctx.beginPath();
  order.forEach((s, i) => { const x = X(s.h), y = Y(s.P); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.stroke();

  // Puntos
  ctx.font = 'bold 12px Inter, sans-serif';
  S.forEach(s => {
    const x = X(s.h), y = Y(s.P);
    ctx.fillStyle = '#e8590c';
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#1a2230';
    ctx.fillText(s.id, x + 7, y - 6);
  });
}

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  const s = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
  return s * p;
}

/* ---- Arranque ---------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', () => {
  initRefSelect();
  $('calcBtn').addEventListener('click', calculate);
  ['tEvap', 'tCond', 'superheat', 'subcool', 'etaIsen', 'capacity'].forEach(id =>
    $(id).addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); }));
  calculate();
});
