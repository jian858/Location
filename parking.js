/* ---------- parking ---------- */
function renderParked() {
  const p = S.parked, box = $('#parkedBox');
  if (!p) { box.innerHTML = '<p class="mute">Nothing saved yet. Tap Park here when you leave your car.</p>'; return; }
  box.innerHTML = `
    <p><b>Saved ${esc(fmtTime(p.t))}</b><br><span class="mute" data-away="parked">${away(p)}</span></p>
    <input id="pNote" placeholder="Level, row or landmark" maxlength="120" value="${esc(p.note)}">
    ${p.photo ? `<img class="shot" src="${p.photo}" alt="Photo of the parking spot">` : ''}
    <div class="row">
      <button class="btn primary" data-act="walk">Walk back</button>
      <label class="btn">Add photo<input id="pPhoto" type="file" accept="image/*" capture="environment" hidden></label>
      <button class="btn" data-act="unpark">Clear</button>
    </div>`;
}

function parkHere() {
  if (!needPos()) return;
  S.parked = {lat: app.pos.lat, lon: app.pos.lon, note: '', photo: '', t: Date.now()};
  save();
  renderParked();
  toast('Parking spot saved.');
}

function savePhoto(file) {
  if (!file || !file.type.startsWith('image/')) return toast('Choose an image file.');
  if (file.size > 8 * 1024 * 1024) return toast('Choose a photo smaller than 8 MB.');
  const img = new Image(), url = URL.createObjectURL(file);
  img.onerror = () => { URL.revokeObjectURL(url); toast('Could not read that photo.'); };
  img.onload = () => {
    const scale = Math.min(1, 480 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    S.parked.photo = canvas.toDataURL('image/jpeg', 0.6);
    URL.revokeObjectURL(url);
    save();
    renderParked();
  };
  img.src = url;
}
