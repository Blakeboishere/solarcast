const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  site: "vasai",
  refreshed: false,
  expandedHourly: false,
  modalOpen: false
};

const siteData = {
  vasai: { name: "Vasai Rooftop Array", capacity: "12.5 kWp", yield: 48.6, peak: 8.2, sun: 7.4, accuracy: 92.4, location: "Vasai, Maharashtra" },
  campus: { name: "Campus Solar Lab", capacity: "8.0 kWp", yield: 31.8, peak: 5.6, sun: 6.9, accuracy: 90.8, location: "Mumbai, Maharashtra" },
  industrial: { name: "Industrial Roof Unit", capacity: "25.0 kWp", yield: 91.2, peak: 17.4, sun: 7.7, accuracy: 94.1, location: "Thane, Maharashtra" }
};

const hours = [
  { time: "6 AM", value: 0.6 }, { time: "8 AM", value: 2.8 },
  { time: "10 AM", value: 5.9 }, { time: "12 PM", value: 8.1 },
  { time: "2 PM", value: 7.3 }, { time: "4 PM", value: 4.6 },
  { time: "6 PM", value: 1.2 }
];

function getCurrentSite() { return siteData[state.site]; }

function updateSite() {
  const data = getCurrentSite();
  $("#predictedValue").textContent = data.yield.toFixed(1);
  $("#peakValue").textContent = data.peak.toFixed(1);
  $("#sunHours").textContent = data.sun.toFixed(1);
  $("#accuracyValue").textContent = data.accuracy.toFixed(1);
  $$(".site-info strong")[0].innerHTML = `${data.name} <span class="verified">✓</span>`;
  $(".site-meta").innerHTML = `${data.location} <i>•</i> ${data.capacity} system`;
  $(".chart-summary > strong").innerHTML = `${data.yield.toFixed(1)} <small>kWh</small>`;
  $(".chart-summary-label").textContent = "Estimated daily yield";
  renderHourly();
  drawChart();
}

function renderHourly() {
  const data = getCurrentSite();
  const multiplier = data.yield / 37.9;
  const list = state.expandedHourly ? [...hours, {time:"7 PM",value:0.2},{time:"8 PM",value:0.0}] : hours;
  $("#hourlyList").innerHTML = list.map((item) => {
    const value = item.value * multiplier;
    const width = Math.max(0, Math.min(100, (value / (8.1 * multiplier)) * 100));
    return `<div class="hour-row"><span class="hour-time">${item.time}</span><div class="hour-bar"><span style="width:${width}%"></span></div><span class="hour-value">${value.toFixed(1)}</span></div>`;
  }).join("");
  $("#showHourlyButton").innerHTML = state.expandedHourly ? 'Show less <span>↑</span>' : 'View full hourly forecast <span>→</span>';
}

function drawChart() {
  const canvas = $("#generationChart");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, rect.width * dpr);
  canvas.height = Math.max(1, rect.height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height;
  const pad = { top: 12, right: 9, bottom: 17, left: 29 };
  const cw = w - pad.left - pad.right, ch = h - pad.top - pad.bottom;
  const max = Math.max(10, getCurrentSite().peak + 1);
  const base = [0,0,0,0,0,0,0.3,1.4,3.4,5.4,6.9,7.9,8.2,7.8,7.1,6.2,4.8,3.1,1.3,.3,0,0,0,0];
  const factor = getCurrentSite().peak / 8.2;
  const vals = base.map(v => v * factor);
  const x = i => pad.left + (i / (vals.length - 1)) * cw;
  const y = v => pad.top + ch - (v / max) * ch;

  ctx.clearRect(0,0,w,h);
  ctx.font = '9px "DM Sans", sans-serif';
  [0,2,4,6,8,10].forEach(v => {
    const yy = y(v);
    if (yy < pad.top - 1 || yy > pad.top + ch + 1) return;
    ctx.beginPath(); ctx.setLineDash([3,4]); ctx.strokeStyle = "#e9f0f5"; ctx.lineWidth = 1;
    ctx.moveTo(pad.left, yy); ctx.lineTo(w-pad.right, yy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#9aabba"; ctx.textAlign = "right"; ctx.fillText(v, pad.left-9, yy+3);
  });

  // Confidence band around the predicted curve.
  ctx.beginPath();
  vals.forEach((v,i) => { const yy = y(Math.min(max, v + (v ? .7 : .08))); i===0 ? ctx.moveTo(x(i),yy) : ctx.lineTo(x(i),yy); });
  for(let i=vals.length-1;i>=0;i--) { ctx.lineTo(x(i), y(Math.max(0, vals[i] - (vals[i] ? .7 : .08)))); }
  ctx.closePath(); ctx.fillStyle = "rgba(112,185,222,.19)"; ctx.fill();

  const gradient = ctx.createLinearGradient(0,pad.top,0,pad.top+ch);
  gradient.addColorStop(0,"rgba(52,143,192,.24)"); gradient.addColorStop(1,"rgba(52,143,192,.015)");
  ctx.beginPath(); vals.forEach((v,i) => i===0 ? ctx.moveTo(x(i),y(v)) : ctx.lineTo(x(i),y(v)));
  ctx.lineTo(x(vals.length-1),pad.top+ch); ctx.lineTo(x(0),pad.top+ch); ctx.closePath(); ctx.fillStyle=gradient; ctx.fill();

  ctx.beginPath(); vals.forEach((v,i) => i===0 ? ctx.moveTo(x(i),y(v)) : ctx.lineTo(x(i),y(v)));
  ctx.strokeStyle="#2c83b8"; ctx.lineWidth=2.5; ctx.lineJoin="round"; ctx.lineCap="round"; ctx.stroke();

  const peakIndex = vals.indexOf(Math.max(...vals));
  ctx.beginPath(); ctx.arc(x(peakIndex),y(vals[peakIndex]),4,0,Math.PI*2); ctx.fillStyle="#fff"; ctx.fill(); ctx.lineWidth=2.5; ctx.strokeStyle="#2c83b8"; ctx.stroke();
  ctx.fillStyle="#2d719a"; ctx.font='700 9px "DM Sans", sans-serif'; ctx.textAlign="center";
  ctx.fillText(`${getCurrentSite().peak.toFixed(1)} kW peak`, x(peakIndex), Math.max(9,y(vals[peakIndex])-12));
}

let toastTimeout;
function showToast(title, message) {
  $("#toastTitle").textContent = title;
  $("#toastMessage").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $("#toast").classList.remove("show"), 3000);
}

function openModal(title, description, details) {
  $("#modalTitle").textContent = title;
  $("#modalDescription").textContent = description;
  $("#modalDetails").innerHTML = details.map(d => `<div class="detail-cell"><small>${d.label}</small><strong>${d.value}</strong><p>${d.note}</p></div>`).join("");
  $("#modalBackdrop").classList.add("open");
  $("#modalBackdrop").setAttribute("aria-hidden","false");
  state.modalOpen = true;
  $("#modalClose").focus();
}
function closeModal() {
  $("#modalBackdrop").classList.remove("open");
  $("#modalBackdrop").setAttribute("aria-hidden","true");
  state.modalOpen = false;
}

$("#siteSelect").addEventListener("change", e => {
  state.site = e.target.value;
  updateSite();
  showToast("Site changed", `Showing forecast for ${getCurrentSite().name}.`);
});
$("#refreshButton").addEventListener("click", () => {
  state.refreshed = true;
  // Simulate a harmless refresh for the prototype; no external request is made.
  const data = getCurrentSite();
  $("#predictedValue").textContent = (data.yield + (Math.random() * .6 - .3)).toFixed(1);
  drawChart();
  showToast("Demo data refreshed", "Sample forecast values have been recalculated locally.");
});
$("#showHourlyButton").addEventListener("click", () => {
  state.expandedHourly = !state.expandedHourly;
  renderHourly();
});
$("#weatherDetailsButton").addEventListener("click", () => {
  openModal("Weather details", "Sample conditions currently used by the forecast preview.", [
    {label:"TEMPERATURE",value:"31°C",note:"Warm conditions; panel efficiency may be slightly reduced."},
    {label:"CLOUD COVER",value:"28%",note:"Partly cloudy with some variation expected."},
    {label:"WIND SPEED",value:"12 km/h",note:"Light breeze, with no notable impact assumed."},
    {label:"SOLAR OUTLOOK",value:"Favourable",note:"Best expected production window: 11 AM–2 PM."}
  ]);
});
$("#notificationButton").addEventListener("click", () => {
  openModal("You're all caught up", "There are no new alerts in this demo workspace.", [
    {label:"SYSTEM STATUS",value:"Online",note:"Interface is running with sample data."},
    {label:"MODEL STATUS",value:"Ready",note:"No live model is connected in this prototype."}
  ]);
});
$("#profileButton").addEventListener("click", () => {
  openModal("Workspace profile", "You're viewing the SolarCast demo administrator workspace.", [
    {label:"PROFILE",value:"Blake G.",note:"System administrator"},
    {label:"ACCESS",value:"Demo mode",note:"Authentication is not implemented."}
  ]);
});
$("#modalClose").addEventListener("click", closeModal);
$("#modalDone").addEventListener("click", closeModal);
$("#modalBackdrop").addEventListener("click", e => { if (e.target === $("#modalBackdrop")) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && state.modalOpen) closeModal(); });
$("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$$(".nav-item").forEach(link => link.addEventListener("click", () => {
  $$(".nav-item").forEach(item => item.classList.remove("active"));
  link.classList.add("active");
  if (window.innerWidth <= 850) $("#sidebar").classList.remove("open");
}));

function setDate() {
  const date = new Date();
  $("#todayDate").textContent = new Intl.DateTimeFormat("en-IN", {weekday:"long", day:"numeric", month:"long", year:"numeric"}).format(date);
}
window.addEventListener("resize", () => drawChart());
setDate();
renderHourly();
requestAnimationFrame(drawChart);
