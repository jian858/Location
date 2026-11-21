/* ---------- trip recorder ---------- */
function tripDistanceLabel(m) {
  return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(2) + ' km';
}
function currentTripElapsed(t) {
  const stop = t.end || (t.paused && t.pauseAt ? t.pauseAt : Date.now());
  return Math.max(0, Math.floor((stop - t.start - (t.pausedMs || 0)) / 1000));
}
function durationLabel(seconds) {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
}
function renderTrip() {
  const t = S.activeTrip, panel = $('#tripStatus');
  if (!t) {
    panel.innerHTML = '<b>No trip in progress</b><p class="mute">Start recording when you begin walking, cycling or driving.</p>';
    $('#tripControls').innerHTML = '<button class="btn primary wide" data-act="tripStart">Start trip</button>';
  } else {
    const paused = t.paused === true;
    panel.innerHTML = `<b>${paused ? 'Trip paused' : 'Recording your trip'}</b><div class="trip-stats"><div><strong>${tripDistanceLabel(t.distance)}</strong><span class="mute">Distance</span></div><div><strong>${durationLabel(currentTripElapsed(t))}</strong><span class="mute">Duration</span></div><div><strong>${t.points.length}</strong><span class="mute">GPS points</span></div></div><p class="mute">Started ${esc(fmtTime(t.start))}. Your route is saved on this device.</p>`;
    $('#tripControls').innerHTML = paused
      ? '<button class="btn primary" data-act="tripResume">Resume</button><button class="btn" data-act="tripStop">Finish trip</button>'
      : '<button class="btn" data-act="tripPause">Pause</button><button class="btn" data-act="tripStop">Finish trip</button>';
  }
  $('#tripList').innerHTML = (S.trips || []).map((trip, i) => `<li class="card"><b>${esc(trip.name || 'Trip ' + (S.trips.length - i))}</b><div class="mute">${esc(fmtTime(trip.start))} · ${tripDistanceLabel(trip.distance)} · ${durationLabel(currentTripElapsed(trip))}</div><div class="row"><button class="btn primary" data-act="tripExport" data-i="${i}">Export GPX</button><button class="btn" data-act="tripDelete" data-i="${i}">Delete</button></div></li>`).join('') || '<li class="mute">Your finished trips will appear here.</li>';
}
function beginWalkingTrip() {
  if (S.activeTrip && !S.activeTrip.paused) return;
  if (S.activeTrip && S.activeTrip.paused) {
    S.activeTrip.paused = false;
    S.activeTrip.pauseAt = null;
    if (app.pos) S.activeTrip.points.push({lat:app.pos.lat,lon:app.pos.lon,t:Date.now()});
  } else if (app.pos) {
    S.activeTrip = {id:'walk' + Date.now(), name:'Walking ' + new Date().toLocaleDateString(), start:Date.now(), end:null, distance:0, points:[{lat:app.pos.lat,lon:app.pos.lon,t:Date.now()}], paused:false, walkingMode:true};
  } else {
    S.activeTrip = {id:'walk' + Date.now(), name:'Walking ' + new Date().toLocaleDateString(), start:Date.now(), end:null, distance:0, points:[], paused:false, walkingMode:true};
  }
  save();
  renderTrip();
  $('#walkState').textContent = 'Walking started. Route recording will begin with your next GPS update.';
}
function pauseWalkingTrip() {
  const t = S.activeTrip;
  if (!t || !t.walkingMode || t.paused) return;
  t.paused = true;
  t.pauseAt = Date.now();
  save();
  renderTrip();
}
function startTrip() {
  if (!needPos()) return;
  if (S.activeTrip) return toast('Finish or resume your current trip first.');
  S.activeTrip = {id:'t' + Date.now(), name:'Trip ' + new Date().toLocaleDateString(), start:Date.now(), end:null, distance:0, points:[{lat:app.pos.lat,lon:app.pos.lon,t:Date.now()}], paused:false};
  save(); renderTrip(); toast('Trip recording started.');
}
function recordTripPoint() {
  const t = S.activeTrip;
  if (!t || t.paused || !app.pos) return;
  if (!t.points.length) { t.points.push({lat:app.pos.lat,lon:app.pos.lon,t:Date.now()}); save(); renderTrip(); return; }
  const last = t.points[t.points.length - 1], now = Date.now();
  const moved = dist(last, app.pos);
  const threshold = t.walkingMode ? 4 : 10;
  if (app.pos.accuracy > 100 || moved < threshold) return;
  t.distance += moved;
  t.points.push({lat:app.pos.lat,lon:app.pos.lon,t:now});
  if (t.points.length > 5000) {
    /* Keep a bounded route history while preserving the overall distance. */
    t.points = t.points.filter((_, i) => i % 2 === 0);
  }
  save(); renderTrip();
}
function pauseTrip() {
  if (!S.activeTrip) return;
  S.activeTrip.paused = true; S.activeTrip.pauseAt = Date.now(); save(); renderTrip(); toast('Trip paused.');
}
function resumeTrip() {
  if (!S.activeTrip) return;
  S.activeTrip.paused = false;
  if (app.pos) S.activeTrip.points.push({lat:app.pos.lat,lon:app.pos.lon,t:Date.now()});
  save(); renderTrip(); toast('Trip recording resumed.');
}
function stopTrip() {
  const t = S.activeTrip;
  if (!t) return;
  if (t.points.length < 2) return toast('Move at least 10 metres before finishing this trip.');
  t.end = Date.now(); t.paused = true;
  S.trips.unshift(t); S.trips = S.trips.slice(0, 20);
  S.activeTrip = null; save(); renderTrip(); toast('Trip saved on this device.');
}
function exportTrip(index) {
  const t = S.trips[Number(index)];
  if (!t) return;
  const escXml = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  const points = t.points.map(p => `<trkpt lat="${p.lat}" lon="${p.lon}"><time>${new Date(p.t).toISOString()}</time></trkpt>`).join('');
  const gpx = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Here Location" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${escXml(t.name)}</name><trkseg>${points}</trkseg></trk></gpx>`;
  const url = URL.createObjectURL(new Blob([gpx],{type:'application/gpx+xml'}));
  const a = Object.assign(document.createElement('a'),{href:url,download:`here-trip-${new Date(t.start).toISOString().slice(0,10)}.gpx`});
  document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function deleteTrip(index) {
  const t = S.trips[Number(index)];
  if (!t || !confirm('Delete this saved trip?')) return;
  S.trips.splice(Number(index),1); save(); renderTrip();
}
