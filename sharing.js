/* ---------- sharing and emergency ---------- */
function needPos() {
  if (app.pos) return true;
  toast('Still finding your location. Tap Find me.');
  return false;
}
const shareText = () => `My location: ${pinUrl(app.pos)}` + (app.addr ? `\n${app.addr}` : '');

async function copyText(t) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(t);
    toast('Copied.');
  } catch (e) {
    toast('Copy is unavailable in this browser. Use Share instead.');
  }
}
async function share() {
  if (!needPos()) return;
  if (!navigator.share) return copyText(shareText());
  try { await navigator.share({text: shareText()}); } catch (e) { /* cancelled */ }
}
function sos() {
  if (!needPos()) return;
  if (!S.contact) {
    toast('Add an emergency contact first.');
    showTab('more');
    return $('#contact').focus();
  }
  if (!confirm('Open a message with your location for your emergency contact?')) return;
  const sep = /iPhone|iPad/.test(navigator.userAgent) ? '&' : '?';
  location.href = `sms:${S.contact}${sep}body=${encodeURIComponent('I need help. ' + shareText())}`;
}
