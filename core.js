/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rad = d => d * Math.PI / 180;
const go = url => window.open(url, '_blank', 'noopener');
const fmtTime = t => new Date(t).toLocaleString([], {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
const fmtDist = m => m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' km';
const shortAddr = a => (a || '').split(',').slice(0, 3).join(',');

function dist(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/* map links */
const pinUrl = p => `https://www.google.com/maps?q=${p.lat},${p.lon}`;
const dirUrl = p => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`;
const nearUrl = q => `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${app.pos.lat},${app.pos.lon},15z`;

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

/* ---------- state and storage ---------- */
const KEY = 'here.v1';
const S = {places: [], parked: null, history: [], contact: '', theme: '', trips: [], activeTrip: null};
const app = {pos: null, addr: '', lastMap: null, lastGeo: null, notified: new Set(), watchId: null};

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;
    S.places = Array.isArray(saved.places) ? saved.places.filter(p =>
      p && typeof p.name === 'string' && Number.isFinite(Number(p.lat)) &&
      Number.isFinite(Number(p.lon)) && Math.abs(Number(p.lat)) <= 90 &&
      Math.abs(Number(p.lon)) <= 180
    ).map(p => ({id: String(p.id || ('p' + Date.now())), name: p.name.slice(0, 40),
      lat: Number(p.lat), lon: Number(p.lon), alert: p.alert === true})) : [];
    S.history = Array.isArray(saved.history) ? saved.history.filter(h =>
      h && Number.isFinite(Number(h.lat)) && Number.isFinite(Number(h.lon)) &&
      Math.abs(Number(h.lat)) <= 90 && Math.abs(Number(h.lon)) <= 180
    ).slice(0, 30) : [];
    S.parked = saved.parked && Number.isFinite(Number(saved.parked.lat)) &&
      Number.isFinite(Number(saved.parked.lon)) &&
      Math.abs(Number(saved.parked.lat)) <= 90 && Math.abs(Number(saved.parked.lon)) <= 180
      ? {...saved.parked, lat:Number(saved.parked.lat), lon:Number(saved.parked.lon),
          note:String(saved.parked.note || '').slice(0,120),
          photo:typeof saved.parked.photo === 'string' ? saved.parked.photo : ''} : null;
    S.contact = typeof saved.contact === 'string' ? saved.contact.slice(0,40) : '';
    S.theme = ['light','dark'].includes(saved.theme) ? saved.theme : '';\n    const validPoint = p => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)) && Math.abs(Number(p.lat)) <= 90 && Math.abs(Number(p.lon)) <= 180;\n    const cleanTrip = t => t && Array.isArray(t.points) && t.points.length && t.points.length <= 5000 && t.points.every(validPoint) && Number.isFinite(Number(t.start)) ? {...t, start:Number(t.start), end:t.end ? Number(t.end) : null, distance:Math.max(0, Number(t.distance) || 0), points:t.points.map(p=>({lat:Number(p.lat),lon:Number(p.lon),t:Number(p.t)||Number(t.start)})), paused:true, pauseAt:null, pausedMs:Math.max(0,Number(t.pausedMs)||0)} : null;\n    S.trips = Array.isArray(saved.trips) ? saved.trips.map(cleanTrip).filter(Boolean).slice(0,20) : [];\n    S.activeTrip = cleanTrip(saved.activeTrip);
  } catch (e) {
    console.warn('Saved Location data could not be read; starting with an empty profile.', e);
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Storage is full. Clear history or remove the parking photo.'); }
}

const away = p => app.pos ? fmtDist(dist(app.pos, p)) + ' away' : '';

/* ---------- tabs and theme ---------- */
function showTab(id) {
  document.querySelectorAll('main > section').forEach(s => { s.hidden = s.id !== id; });
  document.querySelectorAll('nav button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === id));
  $('main').scrollTop = 0;
}
function applyTheme() {
  if (S.theme) document.documentElement.dataset.theme = S.theme;
  else document.documentElement.removeAttribute('data-theme');
}
