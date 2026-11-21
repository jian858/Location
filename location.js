/* ---------- live location ---------- */
function setStatus(t) { $('#status').textContent = t; }

const GEO = {
  gps: {enableHighAccuracy: true, maximumAge: 5000, timeout: 20000},
  walk: {enableHighAccuracy: true, maximumAge: 0, timeout: 30000},
  network: {enableHighAccuracy: false, maximumAge: 60000, timeout: 15000} /* Wi-Fi and mobile data */
};

const PERM = {
  prompt: ['Turn on location', 'Tap Allow, then choose Allow when your browser asks. Location works over GPS, Wi-Fi or mobile data and stays on your phone. Only the map and address lookup use data.', 'Allow location'],
  denied: ['Location is blocked', 'Open your browser’s site settings for this page, set Location to Allow, then tap Try again.', 'Try again'],
  insecure: ['Needs a secure link', 'Browsers only share location on https links. Open this app from your https address, for example your GitHub Pages link.', ''],
  unsupported: ['Location isn’t available', 'This browser can’t share your location. Try Chrome or Safari.', '']
};

function showPerm(state) {
  const [title, text, button] = PERM[state];
  $('#permTitle').textContent = title;
  $('#permText').textContent = text;
  $('#permBtn').textContent = button;
  $('#permBtn').hidden = !button;
  $('#permCard').hidden = false;
  setStatus(state === 'prompt' ? 'Location is off until you allow it.' : `${title}.`);
}

async function initLocation() {
  if (!window.isSecureContext) return showPerm('insecure');
  if (!navigator.geolocation) return showPerm('unsupported');
  try {
    const perm = await navigator.permissions.query({name: 'geolocation'});
    const sync = () => {
      if (perm.state !== 'granted') return showPerm(perm.state);
      if (app.watchId === null) startWatch();
    };
    perm.onchange = sync;
    sync();
  } catch (e) {
    showPerm('prompt'); /* browsers without the Permissions API ask when you tap Allow */
  }
}

function startWatch() {
  if (!navigator.geolocation) return showPerm('unsupported');
  app.walking = false;
  $('#walkBtn').textContent = 'Start walking';
  $('#walkState').textContent = 'Walking mode is off.';
  if (app.watchId !== null) navigator.geolocation.clearWatch(app.watchId);
  app.lastMap = app.lastGeo = null;
  setStatus('Finding you…');
  /* A quick first fix over Wi-Fi or mobile data, then GPS refines it. */
  navigator.geolocation.getCurrentPosition(p => { if (!app.pos) onPos(p); }, () => {}, GEO.network);
  watch(GEO.gps);
}

function watch(options) {
  app.watchId = navigator.geolocation.watchPosition(onPos, e => onGeoError(e, options), options);
}

function startWalking() {
  if (!navigator.geolocation) return showPerm('unsupported');
  if (!window.isSecureContext) return showPerm('insecure');
  app.walking = true;
  if (app.watchId !== null) navigator.geolocation.clearWatch(app.watchId);
  app.watchId = null;
  app.lastMap = null;
  $('#walkBtn').textContent = 'Stop walking';
  $('#walkState').textContent = 'Walking mode is on. Keep this page open for live GPS updates.';
  setStatus('Getting a fresh, high-accuracy GPS fix…');
  watch(GEO.walk);
  if (navigator.geolocation) navigator.geolocation.getCurrentPosition(onPos, e => onGeoError(e, GEO.walk), GEO.walk);
  if (navigator.wakeLock && !app.wakeLock) navigator.wakeLock.request('screen').then(lock => { app.wakeLock = lock; lock.addEventListener('release', () => { app.wakeLock = null; }); }).catch(() => {});
}

function stopWalking() {
  app.walking = false;
  if (app.wakeLock) { app.wakeLock.release().catch(() => {}); app.wakeLock = null; }
  $('#walkBtn').textContent = 'Start walking';
  $('#walkState').textContent = 'Walking mode is off.';
  if (app.watchId !== null) navigator.geolocation.clearWatch(app.watchId);
  app.watchId = null;
  watch(GEO.gps);
  setStatus(app.pos ? 'Live location is on. Turn on Walking mode for more frequent GPS updates.' : 'Finding your location…');
}


function onGeoError(e, options) {
  if (e.code === 1) return showPerm('denied');
  if (options === GEO.gps) { /* no GPS signal, for example indoors */
    navigator.geolocation.clearWatch(app.watchId);
    setStatus('No GPS signal. Using Wi-Fi and mobile data instead…');
    return watch(GEO.network);
  }
  setStatus('Can’t get a location fix. Check that location is on in your phone settings, then tap Find me.');
}

function syncOnline() {
  $('#mapnote').hidden = navigator.onLine;
  if (navigator.onLine && app.pos) { drawMap(); reverse(); }
}

const describeFix = accuracy => accuracy > 500
  ? `Approximate location, accuracy radius about ${fmtDist(accuracy)}. Turn on Precise location in phone settings for better GPS.`
  : `GPS accuracy radius about ${Math.round(accuracy)} m.`;

function onPos(p) {
  const {latitude: lat, longitude: lon, accuracy} = p.coords;
  app.pos = {lat, lon, accuracy, speed:p.coords.speed, heading:p.coords.heading, t:p.timestamp};
  $('#coords').textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  if ($('#accuracy')) $('#accuracy').textContent = `Accuracy: ±${Math.round(accuracy)} m${Number.isFinite(p.coords.speed) && p.coords.speed >= 0.5 ? ` · Speed: ${(p.coords.speed * 3.6).toFixed(1)} km/h` : ''}`;
  $('#permCard').hidden = true;
  setStatus(`${describeFix(accuracy)} Updated ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}.`);
  if (!app.lastMap || dist(app.lastMap, app.pos) > (app.walking ? 5 : 30)) drawMap();
  if (!app.lastGeo || dist(app.lastGeo, app.pos) > 60 || Date.now() - app.lastGeo.t > 120000) reverse();
  checkArrival();
  renderDistances();
  if (typeof recordTripPoint === 'function') recordTripPoint();
}

function drawMap() {
  const {lat, lon} = app.pos, d = 0.004;
  app.lastMap = {lat, lon};
  $('#map').src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d},${lat - d},${lon + d},${lat + d}&layer=mapnik&marker=${lat},${lon}`;
  $('#map').hidden = false;
}

async function reverse() {
  const {lat, lon} = app.pos;
  app.lastGeo = {lat, lon, t: Date.now()};
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error(`Address lookup failed: ${res.status}`);
    app.addr = (await res.json()).display_name || '';
  } catch (e) { app.addr = ''; }
  $('#addr').textContent = app.addr || 'Address not available right now.';
  logHistory();
}
