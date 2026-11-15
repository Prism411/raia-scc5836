export const AX = '#8db3cf', GRID = 'rgba(141,179,207,.13)', INK = '#eaf6ff', MUTE = '#6f93ae', PANEL = '#071a2e';
export const MONO = "'JetBrains Mono', ui-monospace, monospace", SANS = "Barlow, system-ui, sans-serif", DISPLAY = "'Big Shoulders Display', Impact, sans-serif";
let tip;
function el() {
  if (!tip) {
    tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;z-index:9999;left:0;top:0;pointer-events:none;background:rgba(3,14,30,.97);border:1px solid rgba(47,224,240,.4);color:#eaf6ff;padding:8px 10px;font:500 12px/1.45 Barlow,system-ui,sans-serif;max-width:300px;opacity:0;transition:opacity .1s;box-shadow:0 12px 32px rgba(0,0,0,.45)';
    document.body.appendChild(tip);
  }
  return tip;
}
export function showTip(html, ev) {
  const t = el(); t.innerHTML = html; t.style.opacity = '1';
  const w = t.offsetWidth, h = t.offsetHeight; let x = ev.clientX + 14, y = ev.clientY + 14;
  if (x + w > innerWidth - 8) x = ev.clientX - w - 14; if (y + h > innerHeight - 8) y = ev.clientY - h - 14;
  t.style.transform = `translate(${Math.max(4, x)}px,${Math.max(4, y)}px)`;
}
export function hideTip() { if (tip) tip.style.opacity = '0'; }
export function size(node, minH = 200) { const w = Math.max(10, node.clientWidth || 0); const h = Math.max(minH, node.clientHeight || 0); return { w, h }; }
export function styleAxis(g) {
  g.selectAll('path,line').attr('stroke', 'rgba(141,179,207,.35)');
  g.selectAll('text').attr('fill', AX).style('font-family', MONO).style('font-size', '10px');
  return g;
}
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
