/* ---------- history ---------- */
function logHistory() {
  const last = S.history[0];
  if (last && dist(last, app.pos) < 100) return;
  S.history.unshift({lat: app.pos.lat, lon: app.pos.lon, addr: app.addr, t: Date.now()});
  S.history.length = Math.min(S.history.length, 30);
  save();
  renderHistory();
}

function renderHistory() {
  $('#histList').innerHTML = S.history.map((h, i) => `
    <li class="card">
      <b>${esc(shortAddr(h.addr) || `${h.lat.toFixed(4)}, ${h.lon.toFixed(4)}`)}</b>
      <div class="mute">${esc(fmtTime(h.t))}</div>
      <div class="row">
        <button class="btn" data-act="hmap" data-i="${i}">Open map</button>
        <button class="btn" data-act="hsave" data-i="${i}">Save as place</button>
      </div>
    </li>`).join('') || '<li class="mute">Places you visit will show up here.</li>';
}

/* ---------- CSV export and import ---------- */
const stamp = () => new Date().toISOString().slice(0, 10);

function csvCell(v) {
  let t = String(v ?? '');
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(t)) t = "'" + t; /* stops spreadsheet formulas */
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}
const toCsv = (header, rows) => [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');

function download(name, text) {
  const url = URL.createObjectURL(new Blob(['\ufeff' + text], {type: 'text/csv;charset=utf-8'}));
  const a = Object.assign(document.createElement('a'), {href: url, download: name});
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportPlaces() {
  if (!S.places.length) return toast('No saved places to export.');
  download(`here-places-${stamp()}.csv`, toCsv(
    ['name', 'latitude', 'longitude', 'arrival_alert', 'map_link'],
    S.places.map(p => [p.name, p.lat, p.lon, p.alert ? 'yes' : 'no', pinUrl(p)])
  ));
}

function exportHistory() {
  if (!S.history.length) return toast('No history to export.');
  download(`here-history-${stamp()}.csv`, toCsv(
    ['time', 'latitude', 'longitude', 'address', 'map_link'],
    S.history.map(h => [new Date(h.t).toISOString(), h.lat, h.lon, h.addr, pinUrl(h)])
  ));
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}

async function importPlaces(file) {
  if (!file || file.size > 2 * 1024 * 1024) return toast('Choose a CSV file smaller than 2 MB.');
  const [head, ...rows] = parseCsv((await file.text()).replace(/^\ufeff/, ''));
  if (!head) return toast('That file is empty.');
  const col = key => head.findIndex(h => h.trim().toLowerCase() === key);
  const [iName, iLat, iLon, iAlert] = ['name', 'latitude', 'longitude', 'arrival_alert'].map(col);
  if (iName < 0 || iLat < 0 || iLon < 0) return toast('The CSV needs name, latitude and longitude columns.');
  let added = 0;
  rows.forEach((r, k) => {
    const name = (r[iName] || '').trim().replace(/^'(?=[=+\-@])/, '').slice(0, 40);
    const lat = parseFloat(r[iLat]), lon = parseFloat(r[iLon]);
    const valid = name && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    if (!valid || S.places.some(p => p.name === name && dist(p, {lat, lon}) < 20)) return;
    const alert = iAlert >= 0 && /^(yes|true|1)$/i.test((r[iAlert] || '').trim());
    S.places.push({id: 'p' + Date.now() + k, name, lat, lon, alert});
    added++;
  });
  save();
  renderPlaces();
  toast(added ? `Imported ${added} place${added === 1 ? '' : 's'}.` : 'No new places found in that file.');
}
