/* Photos - trình xem và chỉnh sửa ảnh kiểu ChromeOS Gallery */
(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ============================================================
   Biểu tượng: Material Symbols (font con, gọi bằng mã điểm)
   ============================================================ */
const SYM = {"info":59534,"share":59405,"zoom_out":59648,"zoom_in":59647,"crop_rotate":58423,"resize":63239,"tune":58409,"draw":59206,"undo":57702,"redo":57690,"more_vert":58836,"arrow_drop_down":58821,"chevron_left":58376,"chevron_right":58377,"lock":59533,"lock_open":59544,"rotate_left":58393,"rotate_right":58394,"flip":58344,"ink_highlighter":59089,"ink_eraser":59088,"ink_pen":59091,"edit":57680,"broken_image":58285,"folder_open":58056,"image":57937,"check":58826,"close":57676,"photo_library":58387,"add_photo_alternate":58430,"print":58709,"save":57697,"content_paste":57679,"aspect_ratio":59483,"crop":58302,"restart_alt":61523,"document_scanner":58874,"palette":58295,"keyboard":58130,"help":59527,"description":59507,"open_in_new":59541,"save_as":60256,"file_open":60147,"delete":59506,"refresh":58837,"arrow_back":58820,"arrow_forward":58824};
const sym = n => String.fromCodePoint(SYM[n]);
const lineIcon = w => `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/></svg>`;
const paintIcons = (root = document) => $$('md-icon[data-i]', root).forEach(el => { el.textContent = sym(el.dataset.i); });
paintIcons();

/* ============================================================
   Trạng thái
   ============================================================ */
const app = $('#app');
const stage = $('#stage');
const view = $('#view');
const vctx = view.getContext('2d');
const checker = document.createElement('div');
checker.id = 'checker';
stage.insertBefore(checker, view);

const zeroAdj = { exp: 0, con: 0, sat: 0 };
const S = {
  files: [], idx: -1,
  H: [], hi: -1,
  iw: 0, ih: 0, lastW: 0, lastH: 0,
  tool: '',
  scale: 1, fit: 1, panX: 0, panY: 0, fitMode: true,
  sw: 1, sh: 1, dpr: 1,
  crop: null, ratio: 'free',
  lock: true,
  liveAdj: null,
  stroke: null,
  token: 0,
  exif: null,
  draw: { tool: 'pen', sizeIdx: 2, color: '#000000' }
};
const cur = () => S.H[S.hi];
const isDirty = () => S.hi > 0;
const isZero = a => !a.exp && !a.con && !a.sat;
const cssFilter = a => isZero(a) ? 'none' : `brightness(${1 + a.exp / 100 * .6}) contrast(${1 + a.con / 100 * .6}) saturate(${1 + a.sat / 100})`;

/* ============================================================
   Canvas helpers
   ============================================================ */
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const clone = c => { const n = mk(c.width, c.height); n.getContext('2d').drawImage(c, 0, 0); return n; };
const toBlob = (c, type, q) => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('encode')), type, q));

function pixelAdjust(x, w, h, a) {
  const im = x.getImageData(0, 0, w, h), d = im.data;
  const b = 1 + a.exp / 100 * .6, c = 1 + a.con / 100 * .6, s = 1 + a.sat / 100;
  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] * b - 128) * c + 128, g = (d[i + 1] * b - 128) * c + 128, bl = (d[i + 2] * b - 128) * c + 128;
    const l = .299 * r + .587 * g + .114 * bl;
    d[i] = l + (r - l) * s; d[i + 1] = l + (g - l) * s; d[i + 2] = l + (bl - l) * s;
  }
  x.putImageData(im, 0, 0);
}

function flatten(e) {
  const c = mk(e.c.width, e.c.height), x = c.getContext('2d');
  let src = e.c;
  if (e.a) { src = clone(e.c); src.getContext('2d').drawImage(e.a, 0, 0); }
  if (isZero(e.adj)) { x.drawImage(src, 0, 0); return c; }
  if ('filter' in x) { x.filter = cssFilter(e.adj); x.drawImage(src, 0, 0); x.filter = 'none'; }
  else { x.drawImage(src, 0, 0); pixelAdjust(x, c.width, c.height, e.adj); }
  return c;
}

function resample(src, w, h) {
  let c = src;
  while (c.width / 2 >= w && c.height / 2 >= h) {
    const n = mk(Math.max(w, Math.ceil(c.width / 2)), Math.max(h, Math.ceil(c.height / 2)));
    const x = n.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(c, 0, 0, n.width, n.height); c = n;
  }
  const out = mk(w, h), x = out.getContext('2d');
  x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, w, h);
  return out;
}

/* ============================================================
   Lịch sử (hoàn tác / làm lại)
   ============================================================ */
function trimHistory() {
  const budget = 700 * 1024 * 1024;
  const bytes = () => {
    const set = new Set(); let t = 0;
    for (const e of S.H) for (const c of [e.c, e.a]) if (c && !set.has(c)) { set.add(c); t += c.width * c.height * 4; }
    return t;
  };
  while (S.H.length > 2 && S.hi > 1 && (S.H.length > 60 || bytes() > budget)) { S.H.splice(1, 1); S.hi--; }
}
function pushEntry(e) {
  S.H.length = S.hi + 1;
  S.H.push(e); S.hi = S.H.length - 1;
  trimHistory(); afterChange();
}
function applyOp(fn) {
  const base = flatten(cur());
  pushEntry({ c: fn(base), a: null, adj: { ...zeroAdj } });
}
function undo() { if (S.hi > 0 && !S.stroke) { S.hi--; afterChange(); } }
function redo() { if (S.hi < S.H.length - 1 && !S.stroke) { S.hi++; afterChange(); } }

/* Các phép biến đổi */
const opRotate = dir => applyOp(b => {
  const n = mk(b.height, b.width), x = n.getContext('2d');
  x.translate(n.width / 2, n.height / 2); x.rotate(dir * Math.PI / 2); x.drawImage(b, -b.width / 2, -b.height / 2);
  return n;
});
const opFlip = horiz => applyOp(b => {
  const n = mk(b.width, b.height), x = n.getContext('2d');
  if (horiz) { x.translate(b.width, 0); x.scale(-1, 1); } else { x.translate(0, b.height); x.scale(1, -1); }
  x.drawImage(b, 0, 0); return n;
});
const opCrop = r => applyOp(b => {
  const x0 = Math.round(r.x), y0 = Math.round(r.y);
  const w = Math.max(1, Math.min(b.width - x0, Math.round(r.w))), h = Math.max(1, Math.min(b.height - y0, Math.round(r.h)));
  const n = mk(w, h); n.getContext('2d').drawImage(b, x0, y0, w, h, 0, 0, w, h); return n;
});
const opResize = (w, h) => applyOp(b => resample(b, w, h));

/* ============================================================
   Hiển thị / bố cục / thu phóng
   ============================================================ */
function layout() {
  const r = stage.getBoundingClientRect();
  S.sw = Math.max(1, r.width); S.sh = Math.max(1, r.height); S.dpr = window.devicePixelRatio || 1;
  view.width = Math.round(S.sw * S.dpr); view.height = Math.round(S.sh * S.dpr);
  view.style.width = S.sw + 'px'; view.style.height = S.sh + 'px';
  if (!S.iw) return;
  const pad = S.tool === 'crop' ? 44 : 16;
  S.fit = Math.max(.0001, Math.min((S.sw - pad * 2) / S.iw, (S.sh - pad * 2) / S.ih, 1));
  if (S.fitMode) { S.scale = S.fit; S.panX = S.panY = 0; }
  clampPan(); render();
}
function rect() {
  const w = S.iw * S.scale, h = S.ih * S.scale;
  return { x: (S.sw - w) / 2 + S.panX, y: (S.sh - h) / 2 + S.panY, w, h };
}
function clampPan() {
  const w = S.iw * S.scale, h = S.ih * S.scale;
  const mx = Math.max(0, (w - S.sw) / 2), my = Math.max(0, (h - S.sh) / 2);
  S.panX = clamp(S.panX, -mx, mx); S.panY = clamp(S.panY, -my, my);
}
function render() {
  if (!S.H.length || app.dataset.state !== 'image') return;
  const e = cur(), r = rect(), x = vctx;
  x.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
  x.clearRect(0, 0, S.sw, S.sh);
  x.imageSmoothingEnabled = S.scale < 3; x.imageSmoothingQuality = 'high';
  x.drawImage(e.c, r.x, r.y, r.w, r.h);
  const a = S.stroke ? S.stroke.work : e.a;
  if (a) x.drawImage(a, r.x, r.y, r.w, r.h);
  if (S.stroke && S.stroke.layer) {
    x.globalAlpha = S.stroke.alpha; x.drawImage(S.stroke.layer, r.x, r.y, r.w, r.h); x.globalAlpha = 1;
  }
  Object.assign(checker.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', display: 'block' });
  view.style.filter = cssFilter(S.liveAdj || e.adj);
  stage.classList.toggle('zoomed', S.scale > S.fit * 1.001 && S.tool !== 'draw');
  if (S.tool === 'crop') placeCropBox();
  $('#btnZoomOut').disabled = S.scale <= S.fit * 1.001;
  $('#btnZoomIn').disabled = S.scale >= 32;
}
function zoomAt(ns, cx = S.sw / 2, cy = S.sh / 2) {
  ns = clamp(ns, S.fit, 32);
  if (ns <= S.fit * 1.001) { S.fitMode = true; S.scale = S.fit; S.panX = S.panY = 0; render(); return; }
  const r = rect(), ix = (cx - r.x) / S.scale, iy = (cy - r.y) / S.scale;
  S.fitMode = false; S.scale = ns;
  const w = S.iw * ns, h = S.ih * ns;
  S.panX = cx - ix * ns - (S.sw - w) / 2; S.panY = cy - iy * ns - (S.sh - h) / 2;
  clampPan(); render();
}
const zoomBy = f => zoomAt(S.scale * f);
function fitView() { S.fitMode = true; layout(); }

new ResizeObserver(() => layout()).observe(stage);

/* ============================================================
   Cập nhật giao diện sau mỗi thay đổi
   ============================================================ */
function afterChange() {
  const e = cur(); if (!e) return;
  S.iw = e.c.width; S.ih = e.c.height;
  if (S.iw !== S.lastW || S.ih !== S.lastH) { S.fitMode = true; S.panX = S.panY = 0; S.lastW = S.iw; S.lastH = S.ih; }
  S.liveAdj = null;
  [['sExp', 'exp'], ['sCon', 'con'], ['sSat', 'sat']].forEach(([id, k]) => { $('#' + id).value = e.adj[k]; });
  if (document.activeElement !== $('#inW')) $('#inW').value = S.iw;
  if (document.activeElement !== $('#inH')) $('#inH').value = S.ih;
  if (S.tool === 'crop') resetCrop();
  updateUI(); layout(); updateInfo();
}
function updateUI() {
  const st = app.dataset.state, img = st === 'image', dirty = isDirty(), drawing = S.tool === 'draw';
  $$('#tbView md-icon-button').forEach(b => { b.disabled = !img; });
  $$('.js-undo').forEach(b => { b.disabled = !(img && S.hi > 0); });
  $$('.js-redo').forEach(b => { b.disabled = !(img && S.hi < S.H.length - 1); });
  $('#tbView').hidden = drawing; $('#tbDraw').hidden = !drawing;
  $('#btnCancel').hidden = !(img && dirty && !drawing);
  $('#saveGroup').hidden = !(img && dirty && !drawing);
  $('#btnCloseDraw').hidden = !drawing;
  ['miPrint', 'miSaveAs'].forEach(id => { $('#' + id).disabled = !img; });
  const map = { info: 'btnInfo', crop: 'btnCrop', resize: 'btnResize', adjust: 'btnAdjust', draw: 'btnDraw' };
  Object.entries(map).forEach(([t, id]) => { const b = $('#' + id); b.dataset.on = S.tool === t; b.setAttribute('aria-pressed', S.tool === t); });
  const f = S.files[S.idx];
  $('#fileName').textContent = f && img ? f.name : (f ? f.name : '');
  $('#fileCount').textContent = S.files.length > 1 && f ? `${S.idx + 1} / ${S.files.length}` : '';
  $('#navPrev').hidden = !(img && S.idx > 0);
  $('#navNext').hidden = !(img && S.idx < S.files.length - 1);
  document.title = f ? `${f.name} - Photos` : 'Photos';
  $('#cropBox').hidden = !(img && S.tool === 'crop');
}
function setState(s) {
  app.dataset.state = s;
  if (s !== 'image') { checker.style.display = 'none'; vctx.clearRect(0, 0, view.width, view.height); }
  view.hidden = s !== 'image';
  updateUI();
}

/* ============================================================
   Công cụ & bảng bên phải
   ============================================================ */
function setTool(t) {
  if (S.tool === t) t = '';
  if (S.stroke) strokeCancel();
  S.tool = t; app.dataset.tool = t;
  $('#panel').hidden = !t;
  $$('#panel > section').forEach(s => { s.hidden = s.dataset.panel !== t; });
  if (t === 'crop') { S.fitMode = true; resetCrop(); }
  if (t === 'resize') { $('#inW').value = S.iw; $('#inH').value = S.ih; }
  stage.classList.toggle('drawing', t === 'draw');
  updateUI(); layout(); updateInfo();
}
$('#btnInfo').onclick = () => setTool('info');
$('#btnCrop').onclick = () => setTool('crop');
$('#btnResize').onclick = () => setTool('resize');
$('#btnAdjust').onclick = () => setTool('adjust');
$('#btnDraw').onclick = () => setTool('draw');
$('#btnCloseDraw').onclick = () => setTool('');
$$('.js-undo').forEach(b => b.onclick = undo);
$$('.js-redo').forEach(b => b.onclick = redo);
$('#btnZoomIn').onclick = () => zoomBy(1.25);
$('#btnZoomOut').onclick = () => zoomBy(1 / 1.25);

/* ---- Đổi kích thước ---- */
function setLock(v) {
  S.lock = v;
  const b = $('#btnLock'); b.setAttribute('aria-pressed', v); b.dataset.on = v; $('md-icon', b).textContent = sym(v ? 'lock' : 'lock_open');
}
$('#btnLock').onclick = () => setLock(!S.lock);
setLock(true);
$('#inW').addEventListener('input', () => {
  const w = parseInt($('#inW').value, 10);
  if (S.lock && w > 0) $('#inH').value = Math.max(1, Math.round(w * S.ih / S.iw));
});
$('#inH').addEventListener('input', () => {
  const h = parseInt($('#inH').value, 10);
  if (S.lock && h > 0) $('#inW').value = Math.max(1, Math.round(h * S.iw / S.ih));
});
function commitResize() {
  let w = parseInt($('#inW').value, 10), h = parseInt($('#inH').value, 10);
  if (!(w > 0) || !(h > 0)) { $('#inW').value = S.iw; $('#inH').value = S.ih; return; }
  w = clamp(w, 1, 16384); h = clamp(h, 1, 16384);
  if (w * h > 100e6) { toast('Kích thước quá lớn'); $('#inW').value = S.iw; $('#inH').value = S.ih; return; }
  $('#inW').value = w; $('#inH').value = h;
  if (w !== S.iw || h !== S.ih) opResize(w, h);
}
['inW', 'inH'].forEach(id => {
  $('#' + id).addEventListener('change', commitResize);
  $('#' + id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commitResize(); e.target.blur(); } });
});

/* ---- Ánh sáng và màu sắc ---- */
const sliders = { sExp: 'exp', sCon: 'con', sSat: 'sat' };
Object.entries(sliders).forEach(([id, k]) => {
  const el = $('#' + id);
  el.addEventListener('input', () => {
    S.liveAdj = { ...(S.liveAdj || cur().adj), [k]: +el.value };
    view.style.filter = cssFilter(S.liveAdj);
  });
  el.addEventListener('change', () => {
    const e = cur(), adj = { ...e.adj, [k]: +el.value };
    S.liveAdj = null;
    pushEntry({ c: e.c, a: e.a, adj });
  });
  el.addEventListener('dblclick', () => { el.value = 0; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); });
});
$('#btnResetAdj').onclick = () => { const e = cur(); if (!isZero(e.adj)) pushEntry({ c: e.c, a: e.a, adj: { ...zeroAdj } }); };

/* ---- Cắt và xoay ---- */
const RATIOS = [['free', 'Tự do'], ['orig', 'Gốc'], ['1:1', '1:1'], ['4:3', '4:3'], ['3:4', '3:4'], ['3:2', '3:2'], ['2:3', '2:3'], ['16:9', '16:9'], ['9:16', '9:16']];
const ratioVal = () => {
  if (S.ratio === 'free') return null;
  if (S.ratio === 'orig') return S.iw / S.ih;
  const [a, b] = S.ratio.split(':').map(Number); return a / b;
};
$('#ratioChips').innerHTML = RATIOS.map(([k, l]) => `<md-filter-chip label="${l}" data-r="${k}"></md-filter-chip>`).join('');
$('#ratioChips').addEventListener('click', e => {
  const b = e.target.closest('md-filter-chip'); if (!b) return;
  S.ratio = b.dataset.r; fitCropToRatio(); syncChips();
});
function syncChips() { $$('#ratioChips md-filter-chip').forEach(c => { c.selected = c.dataset.r === S.ratio; }); }
function resetCrop() { S.crop = { x: 0, y: 0, w: S.iw, h: S.ih }; if (S.ratio !== 'free') fitCropToRatio(); else { syncChips(); placeCropBox(); } }
function fitCropToRatio() {
  const R = ratioVal();
  if (R) {
    let w = S.iw, h = w / R;
    if (h > S.ih) { h = S.ih; w = h * R; }
    S.crop = { x: (S.iw - w) / 2, y: (S.ih - h) / 2, w, h };
  }
  syncChips(); placeCropBox();
}
function placeCropBox() {
  const box = $('#cropBox'); if (!S.crop || S.tool !== 'crop') return;
  const r = rect(), c = S.crop;
  Object.assign(box.style, { left: r.x + c.x * S.scale + 'px', top: r.y + c.y * S.scale + 'px', width: c.w * S.scale + 'px', height: c.h * S.scale + 'px' });
  $('#cropInfo').textContent = `${Math.round(c.w)} × ${Math.round(c.h)} px`;
}
function dragCrop(h, r0, dx, dy) {
  if (h === 'move') return { x: clamp(r0.x + dx, 0, S.iw - r0.w), y: clamp(r0.y + dy, 0, S.ih - r0.h), w: r0.w, h: r0.h };
  const MIN = 16, R = ratioVal();
  let l = r0.x, t = r0.y, r = r0.x + r0.w, b = r0.y + r0.h;
  if (h.includes('w')) l = clamp(r0.x + dx, 0, r - MIN);
  if (h.includes('e')) r = clamp(r0.x + r0.w + dx, l + MIN, S.iw);
  if (h.includes('n')) t = clamp(r0.y + dy, 0, b - MIN);
  if (h.includes('s')) b = clamp(r0.y + r0.h + dy, t + MIN, S.ih);
  if (!R) return { x: l, y: t, w: r - l, h: b - t };
  const corner = h.length === 2;
  if (corner) {
    const ax = h.includes('w') ? r : l, ay = h.includes('n') ? b : t;
    let w = Math.max(r - l, (b - t) * R);
    const availW = h.includes('w') ? ax : S.iw - ax, availH = h.includes('n') ? ay : S.ih - ay;
    w = Math.min(w, availW, availH * R);
    const hh = w / R;
    return { x: h.includes('w') ? ax - w : ax, y: h.includes('n') ? ay - hh : ay, w, h: hh };
  }
  if (h === 'e' || h === 'w') {
    let w = r - l, hh = w / R; const cy = r0.y + r0.h / 2, maxH = 2 * Math.min(cy, S.ih - cy);
    if (hh > maxH) { hh = maxH; w = hh * R; }
    return { x: h === 'w' ? r - w : l, y: cy - hh / 2, w, h: hh };
  }
  let hh = b - t, w = hh * R; const cx = r0.x + r0.w / 2, maxW = 2 * Math.min(cx, S.iw - cx);
  if (w > maxW) { w = maxW; hh = w / R; }
  return { x: cx - w / 2, y: h === 'n' ? b - hh : t, w, h: hh };
}
(() => {
  const box = $('#cropBox'); let drag = null;
  box.addEventListener('pointerdown', e => {
    e.stopPropagation(); box.setPointerCapture(e.pointerId);
    drag = { h: e.target.dataset.h || 'move', sx: e.clientX, sy: e.clientY, r0: { ...S.crop } };
  });
  box.addEventListener('pointermove', e => {
    if (!drag) return;
    S.crop = dragCrop(drag.h, drag.r0, (e.clientX - drag.sx) / S.scale, (e.clientY - drag.sy) / S.scale);
    placeCropBox();
  });
  const end = () => { drag = null; };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
})();
$('#btnRotL').onclick = () => opRotate(-1);
$('#btnRotR').onclick = () => opRotate(1);
$('#btnFlipH').onclick = () => opFlip(true);
$('#btnFlipV').onclick = () => opFlip(false);
$('#btnApplyCrop').onclick = applyCrop;
function applyCrop() {
  const c = S.crop; if (!c) return;
  if (Math.round(c.w) >= S.iw && Math.round(c.h) >= S.ih) { toast('Chưa chọn vùng cần cắt'); return; }
  S.ratio = 'free'; opCrop(c);
}

/* ---- Chú thích ---- */
const SIZE_PX = [2, 4, 7, 12, 20];
const SIZE_ICON = [1, 2, 3.5, 5.5, 8];
$('#sizeBtns').innerHTML = SIZE_ICON.map((w, i) => `<md-icon-button data-i="${i}" aria-label="Kích thước ${i + 1}">${lineIcon(w)}</md-icon-button>`).join('');
$('#sizeBtns').addEventListener('click', e => { const b = e.target.closest('md-icon-button'); if (b) { S.draw.sizeIdx = +b.dataset.i; syncDraw(); } });
$('#toolBtns').addEventListener('click', e => { const b = e.target.closest('.dt'); if (b) { S.draw.tool = b.dataset.dt; syncDraw(); } });
const PALETTE = [
  '#000000', '#5f6368', '#9aa0a6', '#dadce0', '#ffffff',
  '#f28b82', '#fdd663', '#81c995', '#8ab4f8', '#f6cfb0',
  '#ea4335', '#fbbc04', '#34a853', '#4285f4', '#e8a07f',
  '#c5221f', '#f29900', '#188038', '#1967d2', '#8d5a43'
];
$('#palette').innerHTML = PALETTE.map(c => `<button class="sw" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
$('#palette').addEventListener('click', e => { const b = e.target.closest('.sw'); if (b) setColor(b.dataset.c); });
function setColor(hex) { S.draw.color = hex.toLowerCase(); syncDraw(); syncPicker(true); }
function syncDraw() {
  $$('#toolBtns .dt').forEach(b => b.classList.toggle('on', b.dataset.dt === S.draw.tool));
  $$('#sizeBtns md-icon-button').forEach(b => b.classList.toggle('on', +b.dataset.i === S.draw.sizeIdx));
  $$('#palette .sw').forEach(b => b.classList.toggle('on', b.dataset.c === S.draw.color));
}
/* Bộ chọn màu tuỳ chỉnh */
const hsv = { h: 0, s: 1, v: 0 };
const hexToRgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return { h, s: mx ? d / mx : 0, v: mx };
}
function hsvToRgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c; let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
function syncPicker(fromColor) {
  if (fromColor) { const rgb = hexToRgb(S.draw.color); if (rgb) Object.assign(hsv, rgbToHsv(...rgb)); }
  $('#svBox').style.setProperty('--h', hsv.h);
  $('#svThumb').style.left = hsv.s * 100 + '%'; $('#svThumb').style.top = (1 - hsv.v) * 100 + '%';
  $('#hueThumb').style.left = hsv.h / 360 * 100 + '%';
  $('#hueThumb').style.background = `hsl(${hsv.h} 100% 50%)`;
  if (document.activeElement !== $('#hexIn')) $('#hexIn').value = S.draw.color;
}
function pickFromHsv() { S.draw.color = rgbToHex(...hsvToRgb(hsv.h, hsv.s, hsv.v)); syncDraw(); syncPicker(false); }
function dragOn(el, fn) {
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); fn(e); el.onpointermove = fn; });
  const stop = () => { el.onpointermove = null; };
  el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop);
}
dragOn($('#svBox'), e => { const r = $('#svBox').getBoundingClientRect(); hsv.s = clamp((e.clientX - r.left) / r.width, 0, 1); hsv.v = 1 - clamp((e.clientY - r.top) / r.height, 0, 1); pickFromHsv(); });
dragOn($('#hueBar'), e => { const r = $('#hueBar').getBoundingClientRect(); hsv.h = clamp((e.clientX - r.left) / r.width, 0, .9999) * 360; pickFromHsv(); });
$('#hexIn').addEventListener('input', e => {
  let v = e.target.value.trim(); if (v && v[0] !== '#') v = '#' + v;
  if (/^#[0-9a-f]{6}$/i.test(v)) { S.draw.color = v.toLowerCase(); syncDraw(); syncPicker(true); }
});
$('#hexIn').addEventListener('change', () => { $('#hexIn').value = S.draw.color; });
function showTab(custom) {
  $('#tabPalette').selected = !custom; $('#tabCustom').selected = custom;
  $('#palette').hidden = custom; $('#picker').hidden = !custom;
  if (custom) syncPicker(true);
}
$('#tabPalette').onclick = () => showTab(false);
$('#tabCustom').onclick = () => showTab(true);
syncDraw(); syncPicker(true);

/* Vẽ nét */
function lineScale() { return Math.max(1, Math.max(S.iw, S.ih) / 900); }
function toImg(e) {
  const b = stage.getBoundingClientRect(), r = rect();
  return { x: (e.clientX - b.left - r.x) / S.scale, y: (e.clientY - b.top - r.y) / S.scale };
}
function seg(ctx, a, b, w) { ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
function strokeStart(e) {
  const d = S.draw, ent = cur(), ls = lineScale(), base = SIZE_PX[d.sizeIdx] * ls;
  const st = { tool: d.tool, work: ent.a ? clone(ent.a) : mk(S.iw, S.ih), layer: null, alpha: 1, w: base, last: toImg(e) };
  if (d.tool === 'highlighter') { st.w = base * 2.5; st.alpha = .4; }
  if (d.tool === 'eraser') st.w = base * 2.5;
  let ctx;
  if (d.tool === 'eraser') { ctx = st.work.getContext('2d'); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = ctx.strokeStyle = '#000'; }
  else { st.layer = mk(S.iw, S.ih); ctx = st.layer.getContext('2d'); ctx.fillStyle = ctx.strokeStyle = d.color; }
  st.ctx = ctx;
  ctx.beginPath(); ctx.arc(st.last.x, st.last.y, st.w / 2, 0, Math.PI * 2); ctx.fill();
  S.stroke = st; render();
}
function strokeMove(e) {
  const st = S.stroke; if (!st) return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of (evs.length ? evs : [e])) { const p = toImg(ev); seg(st.ctx, st.last, p, st.w); st.last = p; }
  render();
}
function strokeEnd() {
  const st = S.stroke; if (!st) return;
  const ent = cur();
  if (st.tool === 'eraser') st.work.getContext('2d').globalCompositeOperation = 'source-over';
  else { const x = st.work.getContext('2d'); x.globalAlpha = st.alpha; x.drawImage(st.layer, 0, 0); x.globalAlpha = 1; }
  S.stroke = null;
  pushEntry({ c: ent.c, a: st.work, adj: ent.adj });
}
function strokeCancel() { if (S.stroke) { S.stroke = null; render(); } }

/* ============================================================
   Tương tác trên khung ảnh (kéo, thu phóng, vuốt, vẽ)
   ============================================================ */
const ptrs = new Map(); let gesture = null;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
stage.addEventListener('pointerdown', e => {
  if (app.dataset.state !== 'image' || e.button > 0 || e.target.closest('.nav,#cropBox')) return;
  stage.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (S.tool === 'draw') { if (ptrs.size === 1) strokeStart(e); else strokeCancel(); return; }
  if (ptrs.size === 1) {
    gesture = { type: 'pan', sx: e.clientX, sy: e.clientY, px: S.panX, py: S.panY };
    if (S.scale > S.fit * 1.001) stage.classList.add('grabbing');
  } else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()]; gesture = { type: 'pinch', d0: dist(a, b), s0: S.scale };
  }
});
stage.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (S.tool === 'draw') { if (S.stroke) strokeMove(e); return; }
  if (!gesture) return;
  if (gesture.type === 'pan' && S.scale > S.fit * 1.001) {
    S.panX = gesture.px + e.clientX - gesture.sx; S.panY = gesture.py + e.clientY - gesture.sy; clampPan(); render();
  } else if (gesture.type === 'pinch' && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()], r = stage.getBoundingClientRect();
    zoomAt(gesture.s0 * dist(a, b) / gesture.d0, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
  }
});
function ptrEnd(e) {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (S.tool === 'draw') { if (S.stroke && ptrs.size === 0) strokeEnd(); return; }
  stage.classList.remove('grabbing');
  if (gesture && gesture.type === 'pan' && e.type === 'pointerup' && S.scale <= S.fit * 1.001 && S.tool !== 'crop') {
    const dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
    if (Math.abs(dx) > 70 && Math.abs(dy) < Math.abs(dx) / 2) go(dx < 0 ? 1 : -1);
  }
  gesture = null;
}
stage.addEventListener('pointerup', ptrEnd);
stage.addEventListener('pointercancel', ptrEnd);
stage.addEventListener('wheel', e => {
  if (app.dataset.state !== 'image') return;
  e.preventDefault();
  const r = stage.getBoundingClientRect();
  if (e.ctrlKey || e.metaKey) zoomAt(S.scale * Math.exp(-e.deltaY * .01), e.clientX - r.left, e.clientY - r.top);
  else if (S.scale > S.fit * 1.001) { S.panX -= e.deltaX; S.panY -= e.deltaY; clampPan(); render(); }
  else if (!e.deltaX && S.tool === '') zoomAt(S.scale * Math.exp(-e.deltaY * .0015), e.clientX - r.left, e.clientY - r.top);
}, { passive: false });
stage.addEventListener('dblclick', e => {
  if (app.dataset.state !== 'image' || S.tool === 'draw' || S.tool === 'crop' || e.target.closest('.nav')) return;
  const r = stage.getBoundingClientRect();
  if (S.scale > S.fit * 1.001) zoomAt(S.fit); else zoomAt(Math.max(1, S.fit * 2), e.clientX - r.left, e.clientY - r.top);
});

/* ============================================================
   Mở / đọc tệp
   ============================================================ */
const IMG_EXT = /\.(png|jpe?g|jfif|webp|gif|bmp|avif|svg|ico|tiff?|heic|heif)$/i;
const isImgName = n => IMG_EXT.test(n);
const isImgFile = f => (f.type && f.type.startsWith('image/')) || isImgName(f.name);
const natural = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
const extMime = n => { const m = /\.([a-z0-9]+)$/i.exec(n); const e = m ? m[1].toLowerCase() : ''; return { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', jfif: 'image/jpeg', webp: 'image/webp' }[e] || null; };
const mimeExt = m => ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[m] || 'png');

const ERRORS = {
  ERR_UNSUPPORTED_TYPE: ['Định dạng không được hỗ trợ', 'Photos chưa mở được loại tệp này. Hãy thử ảnh PNG, JPEG, WebP, GIF, BMP hoặc AVIF.'],
  ERR_DECODE_FAILED: ['Không thể mở ảnh này', 'Tệp có thể bị hỏng hoặc trình duyệt không giải mã được định dạng này.'],
  ERR_FILE_READ: ['Không thể đọc tệp', 'Tệp đã bị di chuyển, xóa hoặc bạn không còn quyền truy cập.'],
  ERR_IMAGE_TOO_LARGE: ['Ảnh quá lớn', 'Kích thước ảnh vượt quá giới hạn mà trình duyệt có thể xử lý (16384 px mỗi cạnh).']
};
function showError(code, name) {
  const [t, d] = ERRORS[code] || ERRORS.ERR_DECODE_FAILED;
  $('#errTitle').textContent = t; $('#errText').textContent = name ? `${name}: ${d}` : d; $('#errCode').textContent = code;
  S.H = []; S.hi = -1; S.iw = S.ih = S.lastW = S.lastH = 0;
  if (S.tool) setTool(S.tool);
  setState('error');
}

async function decode(file) {
  try { return await createImageBitmap(file); } catch (e) { /* thử cách khác */ }
  return await new Promise((res, rej) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => { URL.revokeObjectURL(u); res(im); };
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('decode')); };
    im.src = u;
  });
}

async function confirmDiscard() {
  if (!isDirty()) return true;
  const r = await dialog('Bỏ các thay đổi chưa lưu?', 'Ảnh này có chỉnh sửa chưa được lưu. Nếu tiếp tục, các thay đổi sẽ bị mất.', [{ label: 'Ở lại', value: 'stay' }, { label: 'Bỏ thay đổi', value: 'discard' }]);
  return r === 'discard';
}

async function openIndex(i, force) {
  if (!force && S.H.length && !(await confirmDiscard())) return;
  const token = ++S.token, f = S.files[i];
  S.idx = i; S.exif = null;
  if (S.tool === 'draw') setTool('');
  setState('loading'); updateUI();
  let file;
  try { file = f.handle ? await f.handle.getFile() : f.file; f.file = file; }
  catch (e) { if (token === S.token) showError('ERR_FILE_READ', f.name); return; }
  if (token !== S.token) return;
  if (!isImgFile(file) || /\.(heic|heif|tiff?)$/i.test(file.name) && !file.type.startsWith('image/')) { showError('ERR_UNSUPPORTED_TYPE', f.name); return; }
  let src;
  try { src = await decode(file); } catch (e) { if (token === S.token) showError(/\.(heic|heif)$/i.test(file.name) ? 'ERR_UNSUPPORTED_TYPE' : 'ERR_DECODE_FAILED', f.name); return; }
  if (token !== S.token) return;
  const w = src.naturalWidth || src.width || 512, h = src.naturalHeight || src.height || 512;
  if (w > 16384 || h > 16384 || w * h > 268e6) { showError('ERR_IMAGE_TOO_LARGE', f.name); return; }
  const c = mk(w, h); c.getContext('2d').drawImage(src, 0, 0, w, h);
  if (src.close) src.close();
  S.H = [{ c, a: null, adj: { ...zeroAdj } }]; S.hi = 0;
  S.lastW = S.lastH = 0; S.ratio = 'free';
  setState('image');
  afterChange(); fitView();
  if (S.tool === 'crop') resetCrop();
  readExif(file).then(x => { if (token === S.token) { S.exif = x; updateInfo(); } });
}
function openList(list) {
  list = list.filter(Boolean);
  if (!list.length) return;
  S.files = list; openIndex(0, false);
}
function go(d) {
  const n = S.idx + d;
  if (n >= 0 && n < S.files.length) openIndex(n, false);
}
$('#navPrev').onclick = () => go(-1);
$('#navNext').onclick = () => go(1);

async function listDir(dh) {
  const out = [];
  for await (const h of dh.values()) if (h.kind === 'file' && isImgName(h.name)) out.push({ handle: h, name: h.name });
  return out.sort(natural);
}
const PICK_TYPES = [{ description: 'Ảnh', accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.jfif', '.webp', '.gif', '.bmp', '.avif', '.svg', '.ico'] } }];
async function pickFiles() {
  if (S.H.length && !(await confirmDiscard())) return;
  if (window.showOpenFilePicker) {
    try { const hs = await showOpenFilePicker({ multiple: true, types: PICK_TYPES }); S.H = []; openList(hs.map(h => ({ handle: h, name: h.name })).sort(natural)); }
    catch (e) { if (e.name !== 'AbortError') toast('Không thể mở hộp thoại chọn tệp'); }
  } else $('#fileInput').click();
}
async function pickDir() {
  if (S.H.length && !(await confirmDiscard())) return;
  if (window.showDirectoryPicker) {
    try {
      const dh = await showDirectoryPicker({ mode: 'readwrite' });
      const list = await listDir(dh);
      if (!list.length) { toast('Thư mục không có ảnh'); return; }
      S.H = []; openList(list);
    } catch (e) { if (e.name !== 'AbortError') toast('Không thể mở thư mục'); }
  } else {
    const inp = document.createElement('input'); inp.type = 'file'; inp.webkitdirectory = true; inp.multiple = true;
    inp.onchange = () => { const l = [...inp.files].filter(isImgFile).map(f => ({ file: f, name: f.name })).sort(natural); if (l.length) { S.H = []; openList(l); } else toast('Thư mục không có ảnh'); };
    inp.click();
  }
}
$('#fileInput').addEventListener('change', e => {
  const l = [...e.target.files].map(f => ({ file: f, name: f.name })).sort(natural);
  e.target.value = ''; if (l.length) { S.H = []; openList(l); }
});
['btnOpenEmpty', 'btnErrOpen'].forEach(id => $('#' + id).onclick = pickFiles);
$('#btnOpenDirEmpty').onclick = pickDir;

/* Kéo thả */
let dragDepth = 0;
window.addEventListener('dragenter', e => { e.preventDefault(); dragDepth++; stage.classList.add('drag'); });
window.addEventListener('dragover', e => { e.preventDefault(); });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; stage.classList.remove('drag'); } });
window.addEventListener('drop', async e => {
  e.preventDefault(); dragDepth = 0; stage.classList.remove('drag');
  const items = [...(e.dataTransfer?.items || [])].filter(i => i.kind === 'file')
    .map(i => ({ h: i.getAsFileSystemHandle ? i.getAsFileSystemHandle() : null, f: i.getAsFile() }));
  const list = []; let other = null;
  for (const it of items) {
    let h = null; try { h = await it.h; } catch (_) { /* bỏ qua */ }
    if (h && h.kind === 'directory') list.push(...await listDir(h));
    else if (h && h.kind === 'file') { if (isImgName(h.name)) list.push({ handle: h, name: h.name }); else other = h.name; }
    else if (it.f) { if (isImgFile(it.f)) list.push({ file: it.f, name: it.f.name }); else other = it.f.name; }
  }
  if (list.length) { if (S.H.length && !(await confirmDiscard())) return; S.H = []; openList(list.sort(natural)); }
  else if (other) { S.files = [{ name: other }]; S.idx = 0; showError('ERR_UNSUPPORTED_TYPE', other); }
});
/* Dán ảnh */
window.addEventListener('paste', async e => {
  const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith('image/'));
  if (!f) return;
  if (S.H.length && !(await confirmDiscard())) return;
  S.H = []; openList([{ file: new File([f], f.name && f.name !== 'image.png' ? f.name : 'Ảnh đã dán.png', { type: f.type }), name: f.name && f.name !== 'image.png' ? f.name : 'Ảnh đã dán.png' }]);
});
/* Mở bằng ứng dụng (PWA file handler: "Mở bằng Photos" trong Tệp / chuột phải) */
if ('launchQueue' in window) {
  window.launchQueue.setConsumer(async p => {
    const hs = (p.files || []).filter(h => h.kind === 'file');
    if (!hs.length) return;
    const list = hs.filter(h => isImgName(h.name)).map(h => ({ handle: h, name: h.name })).sort(natural);
    if (list.length) openList(list);
    else { S.files = [{ name: hs[0].name }]; S.idx = 0; showError('ERR_UNSUPPORTED_TYPE', hs[0].name); }
  });
}

/* ============================================================
   Thông tin ảnh + EXIF
   ============================================================ */
function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1).replace('.0', '') + ' KB';
  return (b / 1048576).toFixed(2).replace(/\.?0+$/, '') + ' MB';
}
async function readExif(file) {
  try {
    const dv = new DataView(await file.slice(0, 262144).arrayBuffer());
    if (dv.byteLength < 12 || dv.getUint16(0) !== 0xFFD8) return null;
    let o = 2;
    while (o + 4 < dv.byteLength) {
      const m = dv.getUint16(o);
      if (m === 0xFFE1) {
        if (dv.getUint32(o + 4) === 0x45786966) return parseTiff(dv, o + 10);
        o += 2 + dv.getUint16(o + 2);
      } else if ((m & 0xFF00) === 0xFF00 && m !== 0xFFDA) o += 2 + dv.getUint16(o + 2);
      else break;
    }
  } catch (e) { /* không có EXIF */ }
  return null;
}
function parseTiff(dv, base) {
  const le = dv.getUint16(base) === 0x4949;
  const u16 = o => dv.getUint16(base + o, le), u32 = o => dv.getUint32(base + o, le);
  const TS = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
  const readIfd = off => {
    const m = {}; const n = u16(off);
    for (let i = 0; i < n; i++) {
      const e = off + 2 + i * 12, tag = u16(e), type = u16(e + 2), cnt = u32(e + 4), sz = (TS[type] || 1) * cnt;
      const vo = sz > 4 ? u32(e + 8) : e + 8;
      if (type === 2) { let s = ''; for (let k = 0; k < cnt - 1; k++) s += String.fromCharCode(dv.getUint8(base + vo + k)); m[tag] = s.trim(); }
      else if (type === 3) m[tag] = u16(vo);
      else if (type === 4) m[tag] = u32(vo);
      else if (type === 5) { const d = u32(vo + 4); m[tag] = d ? u32(vo) / d : 0; }
    }
    return m;
  };
  const i0 = readIfd(u32(4)), ex = i0[0x8769] ? readIfd(i0[0x8769]) : {};
  return {
    make: i0[0x010F], model: i0[0x0110], lens: ex[0xA434], date: ex[0x9003] || i0[0x0132],
    exposure: ex[0x829A], fnum: ex[0x829D], iso: ex[0x8827], focal: ex[0x920A]
  };
}
function updateInfo() {
  const dl = $('#infoList'); dl.innerHTML = '';
  const f = S.files[S.idx], file = f && f.file;
  if (!file || !S.iw) return;
  const grp = t => { const g = document.createElement('div'); g.className = 'grp'; g.textContent = t; dl.appendChild(g); };
  const row = (t, v) => { if (v === undefined || v === null || v === '') return; const a = document.createElement('dt'), b = document.createElement('dd'); a.textContent = t; b.textContent = v; dl.append(a, b); };
  grp('Tệp');
  row('Tên', f.name);
  row('Loại', file.type || (/\.([a-z0-9]+)$/i.exec(f.name) || [])[1]?.toUpperCase());
  row('Dung lượng', fmtSize(file.size));
  row('Ngày sửa đổi', file.lastModified ? new Date(file.lastModified).toLocaleString('vi-VN') : '');
  row('Kích thước', `${S.iw} × ${S.ih} px`);
  const x = S.exif;
  if (x) {
    grp('Máy ảnh');
    row('Hãng', x.make); row('Kiểu máy', x.model); row('Ống kính', x.lens);
    row('Khẩu độ', x.fnum ? 'ƒ/' + (+x.fnum.toFixed(1)) : '');
    row('Tốc độ màn trập', x.exposure ? (x.exposure < 1 ? `1/${Math.round(1 / x.exposure)} giây` : `${x.exposure} giây`) : '');
    row('ISO', x.iso);
    row('Tiêu cự', x.focal ? Math.round(x.focal) + ' mm' : '');
    row('Ngày chụp', x.date ? x.date.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3') : '');
  }
}

/* ============================================================
   Lưu / chia sẻ / in
   ============================================================ */
const encode = (mime) => {
  const c = flatten(cur());
  return toBlob(c, mime, mime === 'image/png' ? undefined : .92);
};
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function afterSave(blob, name) {
  const f = S.files[S.idx];
  f.file = new File([blob], name, { type: blob.type, lastModified: Date.now() }); f.name = name;
  S.H = [{ c: flatten(cur()), a: null, adj: { ...zeroAdj } }]; S.hi = 0;
  afterChange(); toast('Đã lưu');
}
async function writeTo(handle, blob) {
  if (handle.queryPermission && (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('perm');
  }
  const w = await handle.createWritable(); await w.write(blob); await w.close();
}
async function save() {
  if (app.dataset.state !== 'image') return;
  if (!isDirty()) { toast('Chưa có thay đổi nào'); return; }
  const f = S.files[S.idx], mime = extMime(f.name);
  if (!f.handle || !f.handle.createWritable || !mime) return saveAs();
  try { const blob = await encode(mime); await writeTo(f.handle, blob); await afterSave(blob, f.name); }
  catch (e) { if (e.name !== 'AbortError') { toast('Không thể lưu vào tệp gốc, hãy thử "Lưu dưới dạng"'); } }
}
async function saveAs() {
  if (app.dataset.state !== 'image') return;
  const f = S.files[S.idx], base = f.name.replace(/\.[^.]+$/, ''), m0 = extMime(f.name) || 'image/png';
  try {
    if (window.showSaveFilePicker) {
      const types = [['image/png', 'PNG', '.png'], ['image/jpeg', 'JPEG', ['.jpg', '.jpeg']], ['image/webp', 'WebP', '.webp']]
        .sort((a, b) => (b[0] === m0) - (a[0] === m0)).map(([m, d, e]) => ({ description: d, accept: { [m]: [].concat(e) } }));
      const h = await showSaveFilePicker({ suggestedName: `${base}.${mimeExt(m0)}`, types });
      const mime = extMime(h.name) || 'image/png', blob = await encode(mime);
      await writeTo(h, blob); f.handle = h; await afterSave(blob, h.name);
    } else {
      const blob = await encode(m0), name = `${base}.${mimeExt(m0)}`;
      download(blob, name); await afterSave(blob, name);
    }
  } catch (e) { if (e.name !== 'AbortError') toast('Không thể lưu ảnh'); }
}
async function currentBlob() {
  const f = S.files[S.idx];
  if (!isDirty() && f.file && f.file.type.startsWith('image/')) return f.file;
  return encode('image/png');
}
async function share() {
  if (app.dataset.state !== 'image') return;
  try {
    const blob = await currentBlob(), name = S.files[S.idx].name;
    const file = blob instanceof File ? blob : new File([blob], name.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: file.name }); return; }
    const png = file.type === 'image/png' ? file : await encode('image/png');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    toast('Đã sao chép ảnh vào bộ nhớ tạm');
  } catch (e) { if (e.name !== 'AbortError') toast('Không thể chia sẻ ảnh này'); }
}
$('#btnShare').onclick = share;
async function doPrint() {
  if (app.dataset.state !== 'image') return;
  const blob = await encode('image/png'), img = $('#printImg'), url = URL.createObjectURL(blob);
  img.onload = () => { window.print(); };
  window.addEventListener('afterprint', () => { URL.revokeObjectURL(url); img.removeAttribute('src'); }, { once: true });
  img.src = url;
}
$('#btnSave').onclick = save;
$('#btnCancel').onclick = () => { if (S.tool === 'draw') setTool(''); S.H = [S.H[0]]; S.hi = 0; S.lastW = S.lastH = 0; afterChange(); };

/* ============================================================
   Menu, hộp thoại, tooltip, toast
   ============================================================ */
const moreMenu = $('#moreMenu'), saveMenu = $('#saveMenu');
const closeMenus = () => { moreMenu.open = false; saveMenu.open = false; };
$('#btnMore').onclick = () => { saveMenu.open = false; moreMenu.open = !moreMenu.open; };
$('#btnSaveMenu').onclick = () => { moreMenu.open = false; saveMenu.open = !saveMenu.open; };
$('#miPrint').onclick = () => { closeMenus(); doPrint(); };
$('#miSaveAs').onclick = () => { closeMenus(); saveAs(); };
$('#miSaveAsDd').onclick = () => { closeMenus(); saveAs(); };
$('#miOpen').onclick = () => { closeMenus(); pickFiles(); };
$('#miOpenDir').onclick = () => { closeMenus(); pickDir(); };
$('#miKeys').onclick = () => {
  closeMenus();
  const rows = [['← / →', 'Ảnh trước / ảnh sau'], ['+ / −', 'Phóng to / thu nhỏ'], ['0', 'Vừa khung hình'], ['Ctrl + cuộn', 'Thu phóng'], ['Nhấp đúp', 'Phóng to / vừa khung'],
    ['I', 'Thông tin'], ['Ctrl + Z', 'Hoàn tác'], ['Ctrl + Shift + Z', 'Làm lại'], ['Ctrl + S', 'Lưu dưới dạng'], ['Ctrl + O', 'Mở'], ['Ctrl + P', 'In'], ['Esc', 'Đóng công cụ']];
  dialog('Phím tắt', `<table>${rows.map(r => `<tr><td><kbd>${esc(r[0])}</kbd></td><td>${esc(r[1])}</td></tr>`).join('')}</table>`, [{ label: 'Đóng', value: 'ok' }]);
};
$('#miAbout').onclick = () => { closeMenus(); dialog('Photos', 'Trình xem và chỉnh sửa ảnh kiểu ChromeOS.<br>Phiên bản 1.0.0', [{ label: 'Đóng', value: 'ok' }]); };
$('#miLicense').onclick = () => {
  closeMenus();
  dialog('Giấy phép', '<pre>Photos — Giấy phép MIT\n© 2026 Tuanphong3108\n\nBiểu tượng: Material Icons của Google, theo Giấy phép Apache 2.0.</pre>', [{ label: 'Đóng', value: 'ok' }]);
};
function dialog(title, body, actions) {
  return new Promise(res => {
    const d = $('#dlg');
    $('#dlgTitle').textContent = title; $('#dlgBody').innerHTML = body;
    const box = $('#dlgActions'); box.textContent = '';
    actions.forEach(a => { const b = document.createElement('md-text-button'); b.textContent = a.label; b.onclick = () => d.close(a.value); box.appendChild(b); });
    d.returnValue = '';
    d.addEventListener('closed', () => res(d.returnValue || null), { once: true });
    d.show();
  });
}
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600);
}
/* tooltip */
(() => {
  const tip = $('#tip'); let t;
  document.addEventListener('pointerover', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    clearTimeout(t); tip.hidden = true;
    if (!el || e.pointerType === 'touch') return;
    t = setTimeout(() => {
      tip.textContent = el.dataset.tip; tip.hidden = false;
      const r = el.getBoundingClientRect(), w = tip.offsetWidth;
      tip.style.left = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8) + 'px';
      tip.style.top = Math.min(r.bottom + 8, innerHeight - tip.offsetHeight - 8) + 'px';
    }, 350);
  });
  ['pointerdown', 'wheel', 'keydown'].forEach(ev => document.addEventListener(ev, () => { clearTimeout(t); tip.hidden = true; }, true));
})();

/* ============================================================
   Phím tắt
   ============================================================ */
document.addEventListener('keydown', e => {
  if ($('#dlg').open) return;
  const mod = e.ctrlKey || e.metaKey, typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'range';
  const k = e.key.toLowerCase();
  if (mod && k === 's') { e.preventDefault(); saveAs(); return; }
  if (mod && k === 'o') { e.preventDefault(); pickFiles(); return; }
  if (mod && k === 'p') { e.preventDefault(); doPrint(); return; }
  if (typing) return;
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); redo(); return; }
  if (e.altKey || mod) return;
  if (k === 'escape') { if (moreMenu.open || saveMenu.open) closeMenus(); else if (S.tool) setTool(S.tool); return; }
  if (app.dataset.state !== 'image' && app.dataset.state !== 'error') return;
  if (k === 'arrowright' && e.target.type !== 'range') go(1);
  else if (k === 'arrowleft' && e.target.type !== 'range') go(-1);
  else if (k === '+' || k === '=') zoomBy(1.25);
  else if (k === '-') zoomBy(1 / 1.25);
  else if (k === '0') zoomAt(S.fit);
  else if (k === 'i') setTool('info');
  else if (k === 'enter' && S.tool === 'crop') applyCrop();
});
window.addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('contextmenu', e => { if (S.tool === 'draw') e.preventDefault(); });

/* ============================================================
   Khởi động
   ============================================================ */
setState('empty');
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* bỏ qua */ });
}
/* Cho phép kiểm thử tự động */
window.__photos = { S, openList, setTool };
})();
