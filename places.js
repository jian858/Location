/* ---------- saved places ---------- */
function renderPlaces() {
  $('#placeList').innerHTML = S.places.map(p => `
    <li class="card place">
      <div><b>${esc(p.name)}</b><div class="mute" data-away="${p.id}">${away(p)}</div></div>
      <div class="row">
        <button class="btn primary" data-act="go" data-id="${p.id}">Navigate</button>
        <button class="btn" data-act="rename" data-id="${p.id}">Rename</button>
        <button class="btn" data-act="del" data-id="${p.id}">Delete</button>
      </div>
      <label class="mute"><input type="checkbox" data-act="alert" data-id="${p.id}" ${p.alert ? 'checked' : ''}>Alert me when I arrive</label>
    </li>`).join('') || '<li class="mute">No places yet. Add Home, Work or anywhere you go often.</li>';
  $('#chips').innerHTML = S.places.map(p => `<button class="chip" data-act="go" data-id="${p.id}">${esc(p.name)}</button>`).join('')
    || '<span class="mute">Saved places appear here for one-tap navigation.</span>';
}

function renderDistances() {
  document.querySelectorAll('[data-away]').forEach(el => {
    const p = el.dataset.away === 'parked' ? S.parked : S.places.find(x => x.id === el.dataset.away);
    el.textContent = p ? away(p) : '';
  });
}

async function addPlace(e) {
  e.preventDefault();
  const name = $('#pName').value.trim(), query = $('#pAddr').value.trim();
  if (!name) return toast('Give the place a name.');
  let spot;
  if (query) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`Address search failed: ${res.status}`);
      const found = await res.json();
      if (!found.length) return toast('Address not found. Try adding the city.');
      spot = {lat: +found[0].lat, lon: +found[0].lon};
    } catch (err) { return toast('Couldn’t search. Check your connection.'); }
  } else if (needPos()) {
    spot = {lat: app.pos.lat, lon: app.pos.lon};
  } else return;
  addSaved(name, spot);
  $('#placeForm').reset();
}

function addSaved(name, spot) {
  S.places.push({id: 'p' + Date.now(), name, lat: spot.lat, lon: spot.lon, alert: false});
  save();
  renderPlaces();
  toast(`${name} saved.`);
}

function checkArrival() {
  S.places.filter(p => p.alert).forEach(p => {
    const d = dist(app.pos, p);
    if (d < 100 && !app.notified.has(p.id)) {
      app.notified.add(p.id);
      navigator.vibrate?.([200, 100, 200]);
      toast(`You’ve arrived at ${p.name}.`);
      try { if (window.Notification && Notification.permission === 'granted') new Notification('You’ve arrived', {body: p.name}); } catch (e) { /* not supported */ }
    } else if (d > 200) app.notified.delete(p.id);
  });
}
