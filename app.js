/* ---------- events ---------- */
const placeOf = d => S.places.find(p => p.id === d.id);

const actions = {
  find: startWatch,
  share,
  wa() { if (needPos()) go(`https://wa.me/?text=${encodeURIComponent(shareText())}`); },
  copy() { if (needPos()) copyText(shareText()); },
  sos,
  go(d) { const p = placeOf(d); if (p) go(dirUrl(p)); },
  rename(d) {
    const p = placeOf(d), name = p && prompt('Rename place', p.name);
    if (name && name.trim()) { p.name = name.trim().slice(0, 40); save(); renderPlaces(); }
  },
  del(d) {
    const p = placeOf(d);
    if (p && confirm(`Delete ${p.name}?`)) { S.places = S.places.filter(x => x !== p); save(); renderPlaces(); }
  },
  park: parkHere,
  walk() { go(dirUrl(S.parked)); },
  unpark() { S.parked = null; save(); renderParked(); },
  hmap(d) { go(pinUrl(S.history[+d.i])); },
  hsave(d) {
    const h = S.history[+d.i], name = prompt('Name this place');
    if (h && name && name.trim()) addSaved(name.trim().slice(0, 40), h);
  },
  clearHist() { S.history = []; save(); renderHistory(); },
  exportPlaces,
  exportHistory
};

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act],[data-tab],[data-q],[data-fill]');
  if (!t) return;
  const d = t.dataset;
  if (d.tab) return showTab(d.tab);
  if (d.q) return needPos() && go(nearUrl(d.q));
  if (d.fill !== undefined) { $('#pName').value = d.fill; return; }
  actions[d.act]?.(d);
});

document.addEventListener('input', e => {
  if (e.target.id === 'pNote' && S.parked) { S.parked.note = e.target.value; save(); }
  if (e.target.id === 'contact') { S.contact = e.target.value.trim(); save(); }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'pPhoto' && t.files[0]) savePhoto(t.files[0]);
  if (t.id === 'csvIn' && t.files[0]) { const f = t.files[0]; t.value = ''; importPlaces(f); }
  if (t.id === 'theme') { S.theme = t.value; save(); applyTheme(); }
  if (t.dataset.act === 'alert') {
    const p = S.places.find(x => x.id === t.dataset.id);
    if (!p) return;
    p.alert = t.checked;
    save();
    if (t.checked) {
      if (window.Notification && Notification.permission === 'default') Notification.requestPermission();
      toast('Arrival alerts work while this page is open.');
    }
  }
});

$('#placeForm').addEventListener('submit', addPlace);
$('#nearForm').addEventListener('submit', e => {
  e.preventDefault();
  const q = $('#nearQ').value.trim();
  if (q && needPos()) go(nearUrl(q));
});

/* ---------- start ---------- */
load();
applyTheme();
$('#theme').value = S.theme;
$('#contact').value = S.contact;
renderPlaces();
renderParked();
renderHistory();
initLocation();
syncOnline();
addEventListener('online', syncOnline);
addEventListener('offline', syncOnline);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
