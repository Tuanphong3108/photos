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
const SYM = {"info":59534,"share":59405,"zoom_out":59648,"zoom_in":59647,"crop_rotate":58423,"resize":63239,"tune":58409,"draw":59206,"undo":57702,"redo":57690,"more_vert":58836,"arrow_drop_down":58821,"chevron_left":58376,"chevron_right":58377,"lock":59533,"lock_open":59544,"rotate_left":58393,"rotate_right":58394,"flip":58344,"ink_highlighter":59089,"ink_eraser":59088,"ink_pen":59091,"edit":57680,"broken_image":58285,"folder_open":58056,"image":57937,"check":58826,"close":57676,"photo_library":58387,"add_photo_alternate":58430,"print":58709,"save":57697,"content_paste":57679,"aspect_ratio":59483,"crop":58302,"restart_alt":61523,"document_scanner":58874,"palette":58295,"keyboard":58130,"help":59527,"description":59507,"open_in_new":59541,"save_as":60256,"file_open":60147,"delete":59506,"refresh":58837,"arrow_back":58820,"arrow_forward":58824,"colorize":58296,"menu_book":59929,"gif_box":59299,"text_fields":57954,"format_bold":57912,"format_italic":57919,"folder":58055,"create_new_folder":58060,"fullscreen":58832,"fullscreen_exit":58833,"content_copy":57677};
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
const gifImg = document.createElement('img');
gifImg.id = 'gifView'; gifImg.alt = ''; gifImg.draggable = false; gifImg.hidden = true;
stage.insertBefore(gifImg, view);

const zeroAdj = { exp: 0, con: 0, sat: 0 };
const S = {
  files: [], idx: -1, back: false,
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
  anim: false, animUrl: '',
  exif: null,
  draw: { tool: 'pen', sizeIdx: 2, color: '#000000' },
  text: { font: 'Google Sans Flex', size: 40, wght: 400, rond: 0, italic: false, at: null }
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
function undo() { commitText(); if (S.hi > 0 && !S.stroke) { S.hi--; afterChange(); } }
function redo() { commitText(); if (S.hi < S.H.length - 1 && !S.stroke) { S.hi++; afterChange(); } }

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
  if (S.anim) {
    /* Ảnh động (GIF, APNG, WebP động): để trình duyệt tự phát bằng <img> */
    Object.assign(gifImg.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', imageRendering: S.scale >= 3 ? 'pixelated' : 'auto' });
    Object.assign(checker.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', display: 'block' });
    stage.classList.toggle('zoomed', S.scale > S.fit * 1.001);
    $('#btnZoomOut').disabled = S.scale <= S.fit * 1.001;
    $('#btnZoomIn').disabled = S.scale >= 32;
    return;
  }
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
  placeText();
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
  const edit = img && !S.anim;
  $$('#tbView md-icon-button').forEach(b => { b.disabled = !img; });
  ['btnCrop', 'btnResize', 'btnAdjust', 'btnDraw'].forEach(id => { $('#' + id).disabled = !edit; });
  $('#btnDelete').disabled = !(img && canDelete());
  $$('.js-undo').forEach(b => { b.disabled = !(edit && S.hi > 0); });
  $$('.js-redo').forEach(b => { b.disabled = !(edit && S.hi < S.H.length - 1); });
  $('#tbView').hidden = drawing; $('#tbDraw').hidden = !drawing;
  $('#btnCancel').hidden = !(img && dirty && !drawing);
  $('#saveGroup').hidden = !(img && dirty && !drawing);
  $('#btnCloseDraw').hidden = !drawing;
  $('#miPrint').disabled = !img; $('#miSaveAs').disabled = !edit;
  const map = { info: 'btnInfo', crop: 'btnCrop', resize: 'btnResize', adjust: 'btnAdjust', draw: 'btnDraw' };
  Object.entries(map).forEach(([t, id]) => { const b = $('#' + id); b.dataset.on = S.tool === t; b.setAttribute('aria-pressed', S.tool === t); });
  const f = S.files[S.idx];
  $('#fileName').textContent = f && img ? f.name : (f ? f.name : '');
  $('#fileCount').textContent = S.files.length > 1 && f ? `${S.idx + 1} / ${S.files.length}` : '';
  $('#navPrev').hidden = !(img && S.idx > 0);
  $('#navNext').hidden = !(img && S.idx < S.files.length - 1);
  document.title = st === 'gallery' ? 'Thư viện ảnh - Photos' : f ? `${f.name} - Photos` : 'Photos';
  $('#btnBack').hidden = !(S.back && (img || st === 'loading' || st === 'error'));
  $('#cropBox').hidden = !(img && S.tool === 'crop');
}
function setState(s) {
  app.dataset.state = s;
  if (s !== 'image') { checker.style.display = 'none'; vctx.clearRect(0, 0, view.width, view.height); }
  syncMedia();
  updateUI();
}
function syncMedia() {
  const img = app.dataset.state === 'image';
  view.hidden = !img || S.anim;
  gifImg.hidden = !img || !S.anim;
}

/* ============================================================
   Công cụ & bảng bên phải
   ============================================================ */
function setTool(t) {
  if (S.tool === t) t = '';
  if (S.anim && t && t !== 'info') { toast('Ảnh động chỉ có thể xem, chưa chỉnh sửa được'); return; }
  if (S.stroke) strokeCancel();
  commitText();
  S.tool = t; app.dataset.tool = t;
  $('#panel').hidden = !t;
  $$('#panel > section').forEach(s => { s.hidden = s.dataset.panel !== t; });
  if (t === 'crop') { S.fitMode = true; resetCrop(); }
  if (t === 'resize') { $('#inW').value = S.iw; $('#inH').value = S.ih; }
  stage.classList.toggle('drawing', t === 'draw');
  stage.classList.toggle('texting', t === 'draw' && S.draw.tool === 'text');
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
$('#toolBtns').addEventListener('click', e => { const b = e.target.closest('.dt'); if (b) { commitText(); S.draw.tool = b.dataset.dt; syncDraw(); } });
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
  const isText = S.draw.tool === 'text';
  $('#penOpts').hidden = isText; $('#textOpts').hidden = !isText;
  stage.classList.toggle('texting', S.tool === 'draw' && isText);
  if (isText) syncText(); else cancelText();
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
/* Color Picker: lấy màu từ bất kỳ đâu trên màn hình (EyeDropper API, Chrome/ChromeOS) */
const eyeBtn = $('#btnEyedrop');
if ('EyeDropper' in window) eyeBtn.hidden = false;
eyeBtn.onclick = async () => {
  try { const r = await new window.EyeDropper().open(); setColor(r.sRGBHex); }
  catch (e) { /* người dùng hủy (Esc) */ }
};
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

/* ---- Đánh chữ ---- */
const FONTS = [
  { n: 'Google Sans Flex', w: [1, 1000], flex: true },
  { n: 'Roboto', w: [100, 900] },
  { n: 'Open Sans', w: [300, 800] },
  { n: 'Montserrat', w: [100, 900] },
  { n: 'Lora', w: [400, 700], serif: true },
  { n: 'Playfair Display', w: [400, 900], serif: true },
  { n: 'Roboto Mono', w: [100, 700], mono: true },
  { n: 'Dancing Script', w: [400, 700], script: true },
  { n: 'Arial', w: [400, 700], sys: true },
  { n: 'Times New Roman', w: [400, 700], sys: true, serif: true },
  { n: 'Courier New', w: [400, 700], sys: true, mono: true }
];
const fontInfo = n => FONTS.find(f => f.n === n) || FONTS[0];
var textBox = $('#textBox');
const fSel = $('#fontSel');
fSel.innerHTML = FONTS.map(f => `<md-select-option value="${f.n}"${f.n === S.text.font ? ' selected' : ''}><div slot="headline" style="font-family:'${f.n}'">${f.n}</div></md-select-option>`).join('');
fSel.addEventListener('change', () => { S.text.font = fSel.value; const f = fontInfo(S.text.font); S.text.wght = clamp(S.text.wght, f.w[0], f.w[1]); syncText(); });
$('#btnBold').onclick = () => { const f = fontInfo(S.text.font); S.text.wght = clamp(S.text.wght >= 600 ? 400 : 700, f.w[0], f.w[1]); syncText(); };
$('#btnItalic').onclick = () => { S.text.italic = !S.text.italic; syncText(); };
$('#tSize').addEventListener('input', e => { S.text.size = +e.target.value; syncText(); });
$('#tWght').addEventListener('input', e => { S.text.wght = +e.target.value; syncText(); });
$('#tRond').addEventListener('input', e => { S.text.rond = +e.target.value; syncText(); });
const variation = () => { const f = fontInfo(S.text.font); if (f.sys) return 'normal'; return f.flex ? `"wght" ${S.text.wght}, "ROND" ${S.text.rond}, "slnt" ${S.text.italic ? -10 : 0}` : `"wght" ${S.text.wght}`; };
const fontStack = () => { const f = fontInfo(S.text.font); return `"${f.n}", ${f.mono ? 'monospace' : f.serif ? 'serif' : f.script ? 'cursive' : 'sans-serif'}`; };
const fontPx = () => S.text.size * lineScale();
function syncText() {
  const t = S.text, f = fontInfo(t.font);
  const w = $('#tWght'); w.min = f.w[0]; w.max = f.w[1]; w.value = clamp(t.wght, f.w[0], f.w[1]);
  $('#rondRow').hidden = !f.flex;
  fSel.value = t.font;
  $('#btnBold').classList.toggle('on', t.wght >= 600); $('#btnItalic').classList.toggle('on', t.italic);
  placeText();
}
function placeText() {
  if (textBox.hidden || !S.text.at) return;
  const r = rect(), t = S.text, f = fontInfo(t.font);
  Object.assign(textBox.style, {
    left: r.x + t.at.x * S.scale + 'px', top: r.y + t.at.y * S.scale + 'px',
    fontFamily: fontStack(), fontSize: fontPx() * S.scale + 'px', color: S.draw.color,
    fontWeight: f.sys ? (t.wght >= 600 ? 700 : 400) : t.wght, fontStyle: t.italic && !f.flex ? 'italic' : 'normal', fontVariationSettings: variation()
  });
}
function startText(p) {
  S.text.at = { x: p.x, y: p.y };
  textBox.textContent = ''; textBox.hidden = false;
  placeText();
  document.fonts.load(`${S.text.wght} 20px ${fontStack()}`, 'Aa Ăâđ').catch(() => {});
  textBox.focus();
}
function cancelText() { if (!textBox) return; textBox.hidden = true; textBox.textContent = ''; S.text.at = null; }
function commitText() {
  if (!textBox) return false;
  if (textBox.hidden) return false;
  const txt = textBox.innerText.replace(/ /g, ' ').replace(/\n+$/, '');
  const at = S.text.at;
  cancelText();
  if (!txt.trim() || !at) return false;
  rasterText(txt, at);
  return true;
}
function rasterText(txt, at) {
  const ent = cur(), t = S.text, f = fontInfo(t.font), px = fontPx(), lh = px * 1.25;
  const w = f.sys ? (t.wght >= 600 ? 700 : 400) : t.wght;
  const probe = document.createElement('canvas');
  probe.width = 4; probe.height = 4;
  probe.style.cssText = 'position:fixed;left:-9999px;top:0;pointer-events:none';
  probe.style.fontVariationSettings = variation();
  document.body.appendChild(probe);
  const x = probe.getContext('2d'); x.font = `${w} ${px}px ${fontStack()}`;
  const m = x.measureText('Hg'), asc = m.fontBoundingBoxAscent || px * .9, desc = m.fontBoundingBoxDescent || px * .25;
  const base = (lh - (asc + desc)) / 2 + asc;
  const work = ent.a ? clone(ent.a) : mk(S.iw, S.ih);
  /* vẽ trực tiếp lên canvas ghim vào DOM để áp dụng font-variation-settings */
  const layer = mk(S.iw, S.ih);
  layer.style.cssText = 'position:fixed;left:-99999px;top:0;pointer-events:none';
  layer.style.fontVariationSettings = variation();
  document.body.appendChild(layer);
  const c = layer.getContext('2d');
  c.font = `${t.italic && !f.flex ? 'italic ' : ''}${w} ${px}px ${fontStack()}`; c.fillStyle = S.draw.color; c.textBaseline = 'alphabetic';
  txt.split('\n').forEach((line, i) => c.fillText(line, at.x, at.y + i * lh + base));
  work.getContext('2d').drawImage(layer, 0, 0);
  layer.remove(); probe.remove();
  pushEntry({ c: ent.c, a: work, adj: ent.adj });
}
textBox.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); }
  else if (e.key === 'Escape') { e.preventDefault(); cancelText(); }
});
textBox.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData.getData('text/plain') || '')); });
textBox.addEventListener('pointerdown', e => e.stopPropagation());

function strokeCancel() { if (S.stroke) { S.stroke = null; render(); } }

/* ============================================================
   Tương tác trên khung ảnh (kéo, thu phóng, vuốt, vẽ)
   ============================================================ */
const ptrs = new Map(); let gesture = null;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
stage.addEventListener('pointerdown', e => {
  if (app.dataset.state !== 'image' || e.button > 0 || e.target.closest('.nav,#cropBox,#textBox')) return;
  if (S.tool === 'draw' && S.draw.tool === 'text') { e.preventDefault(); commitText(); startText(toImg(e)); return; }
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
  const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
  if (e.ctrlKey || e.metaKey) zoomAt(S.scale * Math.exp(-dy * .01), e.clientX - r.left, e.clientY - r.top);
  else if (Math.abs(e.deltaX) > Math.abs(dy)) { if (S.scale > S.fit * 1.001) { S.panX -= e.deltaX; clampPan(); render(); } }
  else zoomAt(S.scale * Math.exp(-dy * .002), e.clientX - r.left, e.clientY - r.top);
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

async function isAnimated(file) {
  if (/gif/i.test(file.type || '') || /\.gif$/i.test(file.name)) return true;
  try {
    const b = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
    const find = (txt, from = 0, to = b.length) => {
      const t = [...txt].map(c => c.charCodeAt(0));
      for (let i = from; i <= to - t.length; i++) { let ok = true; for (let k = 0; k < t.length; k++) if (b[i + k] !== t[k]) { ok = false; break; } if (ok) return i; }
      return -1;
    };
    if (find('RIFF', 0, 4) === 0 && find('WEBP', 8, 12) === 8) return find('ANIM', 12, 512) > 0;
    if (b[0] === 0x89 && find('PNG', 1, 4) === 1) { const a = find('acTL'), d = find('IDAT'); return a > 0 && (d < 0 || a < d); }
  } catch (e) { /* coi như ảnh tĩnh */ }
  return false;
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
  const anim = await isAnimated(file);
  if (token !== S.token) return;
  if (S.animUrl) { URL.revokeObjectURL(S.animUrl); S.animUrl = ''; gifImg.removeAttribute('src'); }
  S.anim = anim;
  if (anim) { S.animUrl = URL.createObjectURL(file); gifImg.src = S.animUrl; }
  if (S.anim && S.tool && S.tool !== 'info') setTool(S.tool);
  setState('image');
  afterChange(); fitView();
  if (S.tool === 'crop') resetCrop();
  readExif(file).then(x => { if (token === S.token) { S.exif = x; updateInfo(); } });
}
function openList(list) {
  list = list.filter(Boolean);
  if (!list.length) return;
  S.files = list; S.back = false; openIndex(0, false);
}
function go(d) {
  commitText();
  const n = S.idx + d;
  if (n >= 0 && n < S.files.length) openIndex(n, false);
}
$('#navPrev').onclick = () => go(-1);
$('#navNext').onclick = () => go(1);

/* ---- Đổi tên tệp (nhấp vào tên ở góc trên bên trái; ẩn phần đuôi) ---- */
const nameEl = $('#fileName'), renameF = $('#renameField');
let renaming = false;
const splitName = n => { const d = n.lastIndexOf('.'); return d > 0 ? [n.slice(0, d), n.slice(d)] : [n, '']; };
function startRename() {
  const f = S.files[S.idx];
  if (renaming || !f || app.dataset.state !== 'image') return;
  renaming = true;
  renameF.value = splitName(f.name)[0];
  nameEl.hidden = true; $('#fileCount').hidden = true; renameF.hidden = false;
  requestAnimationFrame(() => { renameF.focus(); if (renameF.select) renameF.select(); });
}
async function endRename(commit) {
  if (!renaming) return;
  renaming = false;
  const v = renameF.value;
  renameF.hidden = true; nameEl.hidden = false; $('#fileCount').hidden = false;
  if (commit) await renameCurrent(v);
}

/* Tệp mở lẻ (Mở / bấm đúp từ Files) không có thư mục cha → xin quyền thư mục chứa tệp để đổi tên */
let lastDir = null;
async function ensureDir(f) {
  const same = async d => { try { return await (await d.getFileHandle(f.name)).isSameEntry(f.handle); } catch (e) { return false; } };
  if (lastDir && await same(lastDir)) return lastDir;
  if (!window.showDirectoryPicker) return null;
  const ok = await dialog('Cấp quyền thư mục', 'Để đổi tên ảnh này, Photos cần quyền truy cập thư mục chứa nó. Hãy chọn thư mục chứa <b>' + esc(f.name) + '</b>.', [{ label: 'Hủy', value: 'no' }, { label: 'Chọn thư mục', value: 'ok', primary: true }]);
  if (ok !== 'ok') return null;
  let d;
  try { d = await window.showDirectoryPicker({ mode: 'readwrite', startIn: f.handle }); } catch (e) { return null; }
  if (!(await same(d))) { toast('Thư mục đã chọn không chứa ảnh này'); return null; }
  return (lastDir = d);
}
async function renameCurrent(raw) {
  const f = S.files[S.idx]; if (!f) return false;
  const [stem, ext] = splitName(f.name), base = raw.trim();
  if (!base || base === stem) return false;
  if (/[\\/:*?"<>|\u0000-\u001f]/.test(base) || /^\.+$/.test(base) || base.length + ext.length > 255) { toast('Tên tệp không hợp lệ'); return false; }
  const name = base + ext, old = f.name;
  try {
    if (f.handle) {
      const h = f.handle;
      if (f.dir && name.toLowerCase() !== old.toLowerCase()) {
        let exists = true;
        try { await f.dir.getFileHandle(name); } catch (e) { if (e.name === 'NotFoundError') exists = false; else throw e; }
        if (exists) { toast('Đã có tệp trùng tên'); return false; }
      }
      if (h.queryPermission && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') {
        if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('perm');
      }
      let done = false;
      if (typeof h.move === 'function') { try { await h.move(name); done = true; } catch (e) { /* tệp chọn lẻ thường không hỗ trợ move → dùng thư mục */ } }
      if (!done) {
        const dir = f.dir || await watchedDir(f) || await ensureDir(f);
        if (!dir) return false;
        let exists = true;
        try { await dir.getFileHandle(name); } catch (e) { if (e.name === 'NotFoundError') exists = false; else throw e; }
        if (exists && name.toLowerCase() !== old.toLowerCase()) { toast('Đã có tệp trùng tên'); return false; }
        const blob = await h.getFile(), nh = await dir.getFileHandle(name, { create: true });
        const w = await nh.createWritable(); await w.write(blob); await w.close();
        await dir.removeEntry(old); f.handle = nh; f.dir = dir;
      }
    }
  } catch (e) { toast('Không thể đổi tên tệp này'); return false; }
  f.name = name;
  if (f.file) f.file = new File([f.file], name, { type: f.file.type, lastModified: f.file.lastModified });
  updateUI(); updateInfo(); toast('Đã đổi tên');
  return true;
}
nameEl.addEventListener('click', startRename);
nameEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startRename(); } });
renameF.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter') { e.preventDefault(); endRename(true); }
  else if (e.key === 'Escape') { e.preventDefault(); endRename(false); }
});
renameF.addEventListener('focusout', () => endRename(true));

/* ---- Xóa ảnh ---- */
const canDelete = () => { const f = S.files[S.idx]; return !!(f && f.handle && typeof f.handle.remove === 'function'); };
async function deleteCurrent() {
  const f = S.files[S.idx];
  if (!f || app.dataset.state !== 'image') return;
  if (!canDelete()) { toast('Không thể xóa ảnh này vì Photos không có quyền truy cập tệp'); return; }
  const r = await dialog('Xóa ảnh này?', `<p>Tệp <b>${esc(f.name)}</b> sẽ bị xóa khỏi thiết bị. Bạn không thể hoàn tác thao tác này.</p>`,
    [{ label: 'Hủy', value: 'cancel' }, { label: 'Xóa', value: 'delete', danger: true }]);
  if (r !== 'delete') return;
  try {
    const h = f.handle;
    if (h.queryPermission && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('perm');
    }
    await h.remove();
  } catch (e) { toast('Không thể xóa tệp'); return; }
  const idx = S.idx;
  S.files.splice(idx, 1); GAL.dirty = true;
  S.H = []; S.hi = -1;
  toast('Đã xóa ảnh');
  if (S.files.length) { openIndex(Math.min(idx, S.files.length - 1), true); return; }
  /* hết ảnh: về màn hình trống */
  S.idx = -1; S.iw = S.ih = S.lastW = S.lastH = 0; S.token++;
  if (S.animUrl) { URL.revokeObjectURL(S.animUrl); S.animUrl = ''; gifImg.removeAttribute('src'); }
  S.anim = false;
  if (S.tool) setTool(S.tool);
  if (S.back) { GAL.dirty = true; toGallery(); } else setState('empty');
}
$('#btnDelete').onclick = deleteCurrent;

async function listDir(dh) {
  const out = [];
  for await (const h of dh.values()) if (h.kind === 'file' && isImgName(h.name)) out.push({ handle: h, name: h.name, dir: dh });
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
/* ============================================================
   Thư viện ảnh: thư mục được theo dõi (nhớ bằng IndexedDB)
   ============================================================ */
const idb = (() => {
  let p;
  const open = () => p || (p = new Promise((res, rej) => {
    const r = indexedDB.open('photos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('dirs', { keyPath: 'id', autoIncrement: true });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('dirs', mode), rq = fn(t.objectStore('dirs'));
      t.oncomplete = () => res(rq && rq.result); t.onerror = t.onabort = () => rej(t.error);
    });
  };
  return { all: () => tx('readonly', s => s.getAll()), add: h => tx('readwrite', s => s.add({ handle: h })), del: id => tx('readwrite', s => s.delete(id)) };
})();

const GAL = { dirs: [], items: [], ready: Promise.resolve(), tok: 0, dirty: false, scroll: 0, t: 0 };
const thumbs = new WeakMap();
const SKIP_DIR = /^(\.|\$RECYCLE\.BIN$|System Volume Information$|node_modules$)/i;
const gal = $('#gallery'), galGrid = $('#galGrid');

async function walk(dh, root, path, out, depth = 0) {
  for await (const h of dh.values()) {
    if (h.kind === 'file') { if (isImgName(h.name)) out.push({ handle: h, name: h.name, dir: dh, root, path: [...path, h.name] }); }
    else if (depth < 10 && !SKIP_DIR.test(h.name)) { try { await walk(h, root, [...path, h.name], out, depth + 1); } catch (e) { /* bỏ qua thư mục không đọc được */ } }
  }
}
async function statAll(items) {
  let i = 0;
  await Promise.all(Array.from({ length: 16 }, async () => {
    while (i < items.length) {
      const it = items[i++];
      try { const f = await it.handle.getFile(); it.mtime = f.lastModified; } catch (e) { it.mtime = 0; }
    }
  }));
}
async function dirPerm(h, ask) {
  try {
    let p = await h.queryPermission({ mode: 'readwrite' });
    if (p !== 'granted' && ask) p = await h.requestPermission({ mode: 'readwrite' });
    return p === 'granted';
  } catch (e) { return false; }
}
function galBusy(on) { $('#galLoad').hidden = !(on && !GAL.items.length); }
function refreshGallery(ask) {
  const tok = ++GAL.tok;
  return (GAL.ready = (async () => {
    galBusy(true);
    const out = [];
    for (const d of GAL.dirs) {
      d.ok = await dirPerm(d.handle, ask);
      if (d.ok) { try { await walk(d.handle, d.handle, [], out); } catch (e) { d.ok = false; } }
    }
    await statAll(out);
    if (tok !== GAL.tok) return;
    out.sort((a, b) => (b.mtime - a.mtime) || natural(a, b));
    GAL.items = out; GAL.t = Date.now(); GAL.dirty = false;
    galBusy(false); renderGallery();
  })());
}

/* ---- Ảnh thu nhỏ (tải lười, tối đa 4 luồng) ---- */
const tq = []; let tact = 0;
function thumbOf(it) {
  if (!thumbs.has(it)) thumbs.set(it, new Promise((res, rej) => { tq.push({ it, res, rej }); pump(); }));
  return thumbs.get(it);
}
function pump() {
  while (tact < 4 && tq.length) {
    const j = tq.shift(); tact++;
    makeThumb(j.it).then(j.res, j.rej).finally(() => { tact--; pump(); });
  }
}
async function makeThumb(it) {
  const file = await it.handle.getFile();
  let src;
  try { src = await createImageBitmap(file, { resizeWidth: 512, resizeQuality: 'medium' }); }
  catch (e) {
    const u = URL.createObjectURL(file), im = new Image();
    try { im.src = u; await im.decode(); const k = Math.min(1, 512 / (im.naturalWidth || 512)); src = { width: Math.max(1, Math.round((im.naturalWidth || 512) * k)), height: Math.max(1, Math.round((im.naturalHeight || 512) * k)), draw: im }; }
    finally { setTimeout(() => URL.revokeObjectURL(u), 1000); }
  }
  const w = src.width, h = src.height, c = mk(w, h);
  c.getContext('2d').drawImage(src.draw || src, 0, 0, w, h);
  if (src.close) src.close();
  const blob = await new Promise(r => c.toBlob(r, 'image/webp', .82));
  if (!blob) throw new Error('thumb');
  return { url: URL.createObjectURL(blob), ratio: w / h };
}
const tileIO = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const t = e.target; tileIO.unobserve(t);
  const it = GAL.items[+t.dataset.i]; if (!it) return;
  thumbOf(it).then(r => { const im = t.firstChild; im.src = r.url; im.onload = () => t.classList.add('ready'); }, () => t.classList.add('bad'));
}), { root: gal, rootMargin: '600px' });

function renderGallery() {
  tileIO.disconnect(); galGrid.textContent = '';
  const none = !GAL.dirs.length, need = GAL.dirs.filter(d => d.ok === false);
  const empty = none || (!GAL.items.length && !need.length);
  $('#galEmpty').hidden = !empty;
  if (empty) {
    $('#galEmptyTitle').textContent = none ? 'Thư viện ảnh' : 'Chưa có ảnh nào';
    $('#galEmptyText').textContent = none
      ? 'Thêm thư mục ảnh để xem tất cả ảnh của bạn tại đây, kể cả trong thư mục con. Photos sẽ ghi nhớ các thư mục này cho những lần mở sau.'
      : 'Photos không tìm thấy ảnh nào trong các thư mục đã thêm.';
  }
  $('#galPerm').hidden = !need.length;
  if (need.length) $('#galPermText').textContent = 'Photos cần bạn cấp lại quyền truy cập thư mục: ' + need.map(d => d.handle.name).join(', ');
  const fmt = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }), frag = document.createDocumentFragment();
  let key = null;
  GAL.items.forEach((it, i) => {
    let k = it.mtime ? fmt.format(it.mtime) : 'Không rõ ngày';
    k = k.charAt(0).toUpperCase() + k.slice(1);
    if (k !== key) { key = k; const hd = document.createElement('h2'); hd.className = 'galHead'; hd.textContent = k; frag.appendChild(hd); }
    const b = document.createElement('button'); b.className = 'tile'; b.dataset.i = i; b.dataset.tip = it.name; b.setAttribute('aria-label', it.name);
    const im = document.createElement('img'); im.alt = ''; im.draggable = false; b.appendChild(im);
    frag.appendChild(b); it.el = b;
  });
  galGrid.appendChild(frag);
  $$('.tile', galGrid).forEach(t => tileIO.observe(t));
}
galGrid.addEventListener('click', e => { const t = e.target.closest('.tile'); if (t) openFromGallery(+t.dataset.i, t); });

/* ---- Vào / ra khỏi thư viện ---- */
const fitBox = (wr, ratio, pad) => {
  const aw = wr.width - pad * 2, ah = wr.height - pad * 2;
  let w = aw, h = w / ratio; if (h > ah) { h = ah; w = h * ratio; }
  return { left: wr.left + (wr.width - w) / 2, top: wr.top + (wr.height - h) / 2, width: w, height: h };
};
const px = b => ({ left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px' });
let opening = false;
async function openFromGallery(i, tile) {
  if (opening || !GAL.items[i]) return;
  opening = true;
  try {
    GAL.scroll = gal.scrollTop;
    S.files = GAL.items; S.back = true;
    const im = tile.firstChild, wr = $('#workspace').getBoundingClientRect();
    let fly = null, anim = null;
    if (tile.classList.contains('ready') && im.naturalWidth) {
      const r0 = tile.getBoundingClientRect(), box = fitBox(wr, im.naturalWidth / im.naturalHeight, 16);
      fly = document.createElement('img'); fly.className = 'fly'; fly.src = im.src; fly.alt = ''; fly.draggable = false;
      Object.assign(fly.style, px(r0), { borderRadius: '16px' });
      document.body.appendChild(fly); app.classList.add('flying');
      anim = fly.animate([{ ...px(r0), borderRadius: '16px' }, { ...px(box), borderRadius: '12px' }], { duration: 420, easing: 'cubic-bezier(.2,0,0,1)', fill: 'forwards' });
    }
    const p = openIndex(i, true);
    await Promise.all([p, anim && anim.finished.catch(() => {})]);
    if (fly) {
      if (app.dataset.state === 'image' && S.iw) {
        const r = rect(), st = stage.getBoundingClientRect();
        const end = { left: st.left + r.x, top: st.top + r.y, width: r.w, height: r.h };
        await fly.animate([{}, { ...px(end), borderRadius: '0px' }], { duration: 160, easing: 'cubic-bezier(.2,0,0,1)', fill: 'forwards' }).finished.catch(() => {});
      }
      await fly.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' }).finished.catch(() => {});
      fly.remove(); app.classList.remove('flying');
    }
  } finally { opening = false; app.classList.remove('flying'); }
}
function toGallery() {
  S.token++; S.H = []; S.hi = -1; S.iw = S.ih = S.lastW = S.lastH = 0;
  if (S.animUrl) { URL.revokeObjectURL(S.animUrl); S.animUrl = ''; gifImg.removeAttribute('src'); }
  S.anim = false; S.exif = null;
  if (S.tool) setTool(S.tool);
  const cur = S.files[S.idx], was = S.files === GAL.items;
  setState('gallery');
  if (was && GAL.dirty) { GAL.dirty = false; renderGallery(); }
  requestAnimationFrame(() => {
    gal.scrollTop = GAL.scroll;
    const t = was && cur && cur.el && cur.el.isConnected ? cur.el : null;
    if (t) t.scrollIntoView({ block: 'nearest' });
  });
}
async function goBack() {
  if (!S.back) return;
  if (S.H.length && !(await confirmDiscard())) return;
  commitText();
  toGallery();
}
$('#btnBack').onclick = goBack;

/* ---- Thêm / quản lý thư mục theo dõi ---- */
async function addDir() {
  let dh;
  try { dh = await window.showDirectoryPicker({ mode: 'readwrite', id: 'photos' }); }
  catch (e) { if (e.name !== 'AbortError') toast('Không thể mở thư mục'); return false; }
  for (const d of GAL.dirs) { try { if (await d.handle.isSameEntry(dh)) { toast('Thư mục này đã được theo dõi'); return 'dup'; } } catch (e) { /* bỏ qua */ } }
  let id; try { id = await idb.add(dh); } catch (e) { id = Date.now(); }
  GAL.dirs.push({ id, handle: dh, ok: true });
  toast('Đã thêm thư mục “' + dh.name + '”');
  return 'added';
}
async function pickDir() {
  if (S.H.length && !(await confirmDiscard())) return;
  if (window.showDirectoryPicker) {
    const r = await addDir();
    if (!r) return;
    if (app.dataset.state !== 'gallery') toGallery();
    if (r === 'added') refreshGallery();
  } else {
    const inp = document.createElement('input'); inp.type = 'file'; inp.webkitdirectory = true; inp.multiple = true;
    inp.onchange = () => { const l = [...inp.files].filter(isImgFile).map(f => ({ file: f, name: f.name })).sort(natural); if (l.length) { S.H = []; openList(l); } else toast('Thư mục không có ảnh'); };
    inp.click();
  }
}
function manageDirs() {
  const body = $('#dlgBody');
  const draw = () => {
    body.innerHTML = GAL.dirs.length
      ? '<div class="dirlist">' + GAL.dirs.map(d => `<div class="dirrow"><md-icon data-i="folder"></md-icon><div class="dn"><b>${esc(d.handle.name)}</b><span>${d.ok === false ? 'Cần cấp lại quyền truy cập' : 'Đang theo dõi, gồm cả thư mục con'}</span></div><md-text-button data-id="${d.id}">Hủy theo dõi</md-text-button></div>`).join('') + '</div>'
      : '<p>Chưa có thư mục nào được theo dõi. Thêm thư mục để xem ảnh trong Thư viện ảnh.</p>';
    paintIcons(body);
  };
  dialog('Quản lý thư mục ảnh', '', [{ label: 'Thêm thư mục ảnh', value: 'add' }, { label: 'Xong', value: 'ok' }]).then(async v => {
    body.onclick = null;
    if (v === 'add' && window.showDirectoryPicker) { if (await addDir() === 'added') refreshGallery(); manageDirs(); }
  });
  draw();
  body.onclick = async e => {
    const b = e.target.closest('md-text-button[data-id]'); if (!b) return;
    const id = +b.dataset.id;
    try { await idb.del(id); } catch (err) { /* bỏ qua */ }
    GAL.dirs = GAL.dirs.filter(d => d.id !== id);
    refreshGallery(); draw();
  };
}
$('#miManageDirs').onclick = () => { closeMenus(); manageDirs(); };
$('#btnGalAdd').onclick = pickDir;
$('#btnGalOpen').onclick = pickFiles;
$('#btnGalPerm').onclick = () => refreshGallery(true);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && app.dataset.state === 'gallery' && GAL.dirs.length && Date.now() - GAL.t > 15000) refreshGallery();
});

/* ---- Ảnh mở từ ngoài (bấm đúp trong Files) có nằm trong thư mục theo dõi không? ---- */
async function watchedInfo(handle) {
  for (const d of GAL.dirs) { try { const p = await d.handle.resolve(handle); if (p) return { d, path: p }; } catch (e) { /* bỏ qua */ } }
  return null;
}
async function watchedDir(f) {
  const w = f.watch; if (!w) return null;
  try {
    if (!(await dirPerm(w.d.handle, true))) return null;
    let dh = w.d.handle; for (const seg of w.path.slice(0, -1)) dh = await dh.getDirectoryHandle(seg);
    return dh;
  } catch (e) { return null; }
}
async function adoptLaunch(first, list) {
  await GAL.ready;
  const info = await watchedInfo(first.handle);
  if (!info || S.files[S.idx] !== first) return;
  first.watch = info; S.back = true; updateUI();
  let idx = -1;
  for (let i = 0; i < GAL.items.length && idx < 0; i++) {
    const it = GAL.items[i];
    if (it.name === first.name) { try { if (await it.handle.isSameEntry(first.handle)) idx = i; } catch (e) { /* bỏ qua */ } }
  }
  if (idx >= 0 && S.files.length === list.length && S.files[S.idx] === first) { S.files = GAL.items; S.idx = idx; updateUI(); }
}
GAL.ready = (async () => {
  try { GAL.dirs = (await idb.all()).map(r => ({ id: r.id, handle: r.handle, ok: null })); } catch (e) { GAL.dirs = []; }
  await refreshGallery();
})();

$('#fileInput').addEventListener('change', e => {
  const l = [...e.target.files].map(f => ({ file: f, name: f.name })).sort(natural);
  e.target.value = ''; if (l.length) { S.H = []; openList(l); }
});
['btnOpenEmpty', 'btnErrOpen'].forEach(id => $('#' + id).onclick = pickFiles);
$('#btnOpenDirEmpty').onclick = pickDir;

/* Không cho kéo ảnh / phần tử ra ngoài (tránh bóng mờ của Chrome khi kéo) */
document.addEventListener('dragstart', e => { if (!(e.target.closest && e.target.closest('input, textarea, md-outlined-text-field'))) e.preventDefault(); });

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
    if (list.length) { openList(list); adoptLaunch(list[0], list); }
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
  if (S.back) { thumbs.delete(f); GAL.dirty = true; }
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
  commitText();
  if (app.dataset.state !== 'image') return;
  if (!isDirty()) { toast('Chưa có thay đổi nào'); return; }
  const f = S.files[S.idx], mime = extMime(f.name);
  if (!f.handle || !f.handle.createWritable || !mime) return saveAs();
  try { const blob = await encode(mime); await writeTo(f.handle, blob); await afterSave(blob, f.name); }
  catch (e) { if (e.name !== 'AbortError') { toast('Không thể lưu vào tệp gốc, hãy thử "Lưu dưới dạng"'); } }
}
async function saveAs() {
  commitText();
  if (app.dataset.state !== 'image') return;
  if (S.anim) { toast('Ảnh động chỉ có thể xem'); return; }
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
const HELP_URL = 'https://support.google.com/chromebook/answer/1751068?hl=vi&ref_topic=12016120&sjid=16665206169942355344-NC';
const HELP_HTML = `
<p>Bạn có thể mở và chỉnh sửa cơ bản các ảnh đã lưu trên thiết bị của mình.</p>

<h3>Mở ảnh</h3>
<ul>
  <li>Chọn biểu tượng <b>Thêm</b> (⋮) rồi chọn <b>Mở...</b> (<kbd>Ctrl + O</kbd>) để chọn một hoặc nhiều ảnh, hoặc <b>Mở thư mục...</b> để thêm thư mục ảnh. Photos ghi nhớ thư mục này và hiển thị tất cả ảnh (kể cả trong thư mục con) ở màn hình <b>Thư viện ảnh</b> mỗi khi bạn mở ứng dụng.</li>
  <li>Chọn một ảnh trong Thư viện ảnh để xem và chỉnh sửa; chọn mũi tên <b>Quay lại</b> (hoặc nhấn <kbd>Esc</kbd>) để về thư viện. Dùng <b>Quản lý thư mục ảnh</b> trong menu <b>Thêm</b> để thêm hoặc hủy theo dõi thư mục.</li>
  <li>Kéo thả ảnh hoặc thư mục vào cửa sổ, hoặc dán ảnh từ bộ nhớ tạm (<kbd>Ctrl + V</kbd>).</li>
  <li>Sau khi cài Photos thành ứng dụng, bạn có thể nhấp chuột phải vào ảnh trong ứng dụng Files rồi chọn <b>Mở bằng Photos</b>.</li>
  <li>Để chuyển giữa các ảnh, dùng nút mũi tên hai bên, phím <kbd>←</kbd> / <kbd>→</kbd> hoặc vuốt ngang.</li>
</ul>

<h3>Xem ảnh</h3>
<ul>
  <li><b>Thu phóng:</b> dùng biểu tượng Phóng to / Thu nhỏ, phím <kbd>+</kbd> / <kbd>−</kbd>, <kbd>Ctrl</kbd> + cuộn chuột hoặc chụm hai ngón. Nhấp đúp để phóng to hoặc quay về vừa khung (<kbd>0</kbd>). Khi đã phóng to, kéo ảnh để di chuyển.</li>
  <li><b>Thông tin:</b> chọn biểu tượng Thông tin (<kbd>I</kbd>) để xem tên, loại, dung lượng, ngày sửa đổi, kích thước và dữ liệu EXIF của ảnh (nếu có).</li>
</ul>

<h3>Chỉnh sửa ảnh</h3>
<p>Chọn ảnh rồi dùng các biểu tượng trên thanh công cụ:</p>
<ul>
  <li><b>Đổi tên:</b> chọn tên tệp ở góc trên bên trái (hoặc nhấn <kbd>F2</kbd>), nhập tên mới rồi nhấn <kbd>Enter</kbd>. Phần đuôi tệp được giữ nguyên.</li>
  <li><b>Cắt và xoay:</b> kéo khung để cắt, chọn tỷ lệ khung hình, xoay 90° hoặc lật ngang / dọc rồi chọn <b>Áp dụng</b>.</li>
  <li><b>Đổi kích thước:</b> nhập chiều rộng và chiều cao. Bật / tắt khóa tỷ lệ khung hình để giữ hoặc thay đổi tỷ lệ.</li>
  <li><b>Ánh sáng và màu sắc:</b> kéo thanh trượt để chỉnh độ phơi sáng, độ tương phản và độ bão hòa.</li>
  <li><b>Chú thích:</b> vẽ bằng bút, bút đánh dấu hoặc dùng tẩy để xóa nét đã vẽ. Chọn kích thước nét và màu từ bảng màu, hoặc chọn <b>Tuỳ chỉnh</b> để nhập mã màu hay dùng <b>Color Picker</b> lấy màu từ bất kỳ đâu trên màn hình. Chọn <b>Đóng</b> khi vẽ xong.</li>
  <li><b>Đánh chữ:</b> trong <b>Chú thích</b>, chọn công cụ chữ, nhấn vào ảnh rồi gõ. Chọn phông, cỡ chữ và độ đậm; với Google Sans Flex còn chỉnh được độ bo tròn. Nhấn Enter để hoàn tất, Shift+Enter để xuống dòng, Esc để huỷ.</li>
  <li><b>Hoàn tác và làm lại:</b> dùng biểu tượng Hoàn tác / Làm lại (<kbd>Ctrl + Z</kbd> / <kbd>Ctrl + Shift + Z</kbd>).</li>
</ul>

<h3>Lưu, in và chia sẻ</h3>
<ul>
  <li>Sau khi chỉnh sửa, chọn <b>Lưu</b> để ghi vào tệp gốc, hoặc <b>Hủy chỉnh sửa</b> để bỏ mọi thay đổi.</li>
  <li><b>Lưu dưới dạng</b> (<kbd>Ctrl + S</kbd>) cho phép đặt tên mới và chọn định dạng PNG, JPEG hoặc WebP.</li>
  <li><b>In:</b> chọn biểu tượng Thêm (⋮) rồi chọn <b>In</b> (<kbd>Ctrl + P</kbd>).</li>
  <li><b>Xóa:</b> chọn biểu tượng Xóa (hoặc phím <kbd>Delete</kbd>) rồi xác nhận để xóa tệp khỏi thiết bị. Chỉ xóa được ảnh mở bằng <b>Mở...</b>, <b>Mở thư mục...</b> hoặc <b>Mở bằng Photos</b>.
  <li><b>Chia sẻ:</b> chọn biểu tượng Chia sẻ để gửi ảnh qua các ứng dụng khác, hoặc sao chép ảnh vào bộ nhớ tạm nếu thiết bị không hỗ trợ chia sẻ.</li>
</ul>

<h3>Lưu ý</h3>
<ul>
  <li>Ảnh động (GIF, APNG, WebP động) chỉ có thể xem, các công cụ chỉnh sửa sẽ bị làm xám.</li>
  <li>Một số định dạng như HEIC hiện chưa mở được.</li>
</ul>`;
$('#miHelp').onclick = async () => {
  closeMenus();
  const r = await dialog('Mở và chỉnh sửa ảnh', HELP_HTML, [{ label: 'Xem bài gốc của Google', value: 'web' }, { label: 'Đóng', value: 'ok' }]);
  if (r === 'web') window.open(HELP_URL, '_blank', 'noopener,noreferrer');
};
$('#miLicense').onclick = () => {
  closeMenus();
  dialog('Giấy phép', '<pre>Photos — Giấy phép MIT\n© 2026 Tuanphong3108\n\nThành phần bên thứ ba:\n• Material Web Components (@material/web) — Giấy phép Apache 2.0\n• Material Symbols — Giấy phép Apache 2.0\n• Google Sans Flex, Roboto, Open Sans, Montserrat, Lora, Playfair Display, Roboto Mono, Dancing Script — SIL Open Font License 1.1</pre>', [{ label: 'Đóng', value: 'ok' }]);
};
function dialog(title, body, actions) {
  return new Promise(res => {
    const d = $('#dlg');
    $('#dlgTitle').textContent = title; $('#dlgBody').innerHTML = body;
    const box = $('#dlgActions'); box.textContent = '';
    actions.forEach(a => {
      const b = document.createElement('md-text-button'); b.textContent = a.label; b.onclick = () => d.close(a.value);
      if (a.danger) b.style.setProperty('--md-text-button-label-text-color', 'var(--md-sys-color-error)');
      box.appendChild(b);
    });
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
  const inner = (e.composedPath && e.composedPath()[0]) || e.target;
  const mod = e.ctrlKey || e.metaKey, typing = (/^(INPUT|TEXTAREA)$/.test(inner.tagName) && inner.type !== 'range') || inner.id === 'textBox';
  const onRange = inner.type === 'range';
  const k = e.key.toLowerCase();
  if (mod && k === 's') { e.preventDefault(); saveAs(); return; }
  if (mod && k === 'o') { e.preventDefault(); pickFiles(); return; }
  if (mod && k === 'p') { e.preventDefault(); doPrint(); return; }
  if (typing) return;
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); redo(); return; }
  if (e.altKey || mod) return;
  if (k === 'escape') { if (moreMenu.open || saveMenu.open) closeMenus(); else if (S.tool) setTool(S.tool); else if (S.back && (app.dataset.state === 'image' || app.dataset.state === 'error')) goBack(); return; }
  if (app.dataset.state !== 'image' && app.dataset.state !== 'error') return;
  if (k === 'delete') { deleteCurrent(); return; }
  if (k === 'arrowright' && !onRange) go(1);
  else if (k === 'arrowleft' && !onRange) go(-1);
  else if (k === 'f2') startRename();
  else if (k === '+' || k === '=') zoomBy(1.25);
  else if (k === '-') zoomBy(1 / 1.25);
  else if (k === '0') zoomAt(S.fit);
  else if (k === 'i') setTool('info');
  else if (k === 'f') toggleFs();
  else if (k === 'enter' && S.tool === 'crop') applyCrop();
});
window.addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });


/* ============================================================
   Khởi động
   ============================================================ */
setState('gallery');
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  /* Bản cập nhật: kiểm tra bản mới mỗi lần mở và tự tải lại 1 lần khi service worker mới tiếp quản */
  const hadSW = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadSW || reloaded || S.H.length && isDirty()) return;
    reloaded = true; location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => { /* bỏ qua */ });
}

/* ============================================================
   Toàn màn hình + menu chuột phải tùy chỉnh
   ============================================================ */
const isFs = () => !!document.fullscreenElement;
function toggleFs() {
  if (isFs()) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => toast('Không thể bật toàn màn hình'));
}
document.addEventListener('fullscreenchange', () => {
  const b = $('#btnFs'); b.querySelector('md-icon').dataset.i = isFs() ? 'fullscreen_exit' : 'fullscreen';
  paintIcons(b); b.dataset.tip = isFs() ? 'Thoát toàn màn hình' : 'Toàn màn hình'; b.setAttribute('aria-label', b.dataset.tip);
  $('#ctxMenu').open = false;
  app.classList.toggle('fs', isFs());
  if (isFs() && S.tool) setTool(S.tool);
  fsNear(false); layout();
});
const fsExit = $('#fsExit');
const fsNear = on => fsExit.classList.toggle('show', !!on && isFs());
fsExit.onclick = toggleFs;
window.addEventListener('pointermove', e => { if (isFs()) fsNear(e.clientY < 96 || e.target === fsExit || fsExit.matches(':hover')); }, { passive: true });
document.addEventListener('mouseleave', () => fsNear(false));
$('#btnFs').onclick = toggleFs;

const cm = $('#ctxMenu'), ctxAnchor = $('#ctxAnchor');
async function copyImage() {
  try {
    const f = S.files[S.idx], blob = (!isDirty() && f.file && f.file.type === 'image/png') ? f.file : await encode('image/png');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    toast('Đã sao chép ảnh vào bộ nhớ tạm');
  } catch (e) { toast('Không thể sao chép ảnh này'); }
}
function ctxItems(e) {
  const st = app.dataset.state, tile = e.target.closest && e.target.closest('.tile');
  const it = (icon, label, fn, opt = {}) => ({ icon, label, fn, ...opt });
  if (st === 'gallery') {
    const out = [];
    if (tile) out.push(it('image', 'Mở', () => openFromGallery(+tile.dataset.i, tile)), 'sep');
    out.push(it('refresh', 'Làm mới', () => refreshGallery()), it('create_new_folder', 'Thêm thư mục ảnh...', pickDir), it('folder_open', 'Quản lý thư mục ảnh', manageDirs), 'sep', it('', 'Mở ảnh...', pickFiles));
    return out;
  }
  if (st === 'image') {
    const edit = !S.anim, drawing = S.tool === 'draw';
    const out = [
      it('info', 'Thông tin', () => setTool('info'), { on: S.tool === 'info' }),
      it('content_copy', 'Sao chép ảnh', copyImage),
      it('share', 'Chia sẻ', share), 'sep',
      it('zoom_in', 'Phóng to', () => zoomBy(1.25)), it('zoom_out', 'Thu nhỏ', () => zoomBy(1 / 1.25), { off: S.scale <= S.fit * 1.001 }),
      it('', 'Vừa khung', () => zoomAt(S.fit)),
      it(isFs() ? 'fullscreen_exit' : 'fullscreen', isFs() ? 'Thoát toàn màn hình' : 'Toàn màn hình', toggleFs), 'sep',
      it('edit', 'Đổi tên', startRename, { off: drawing })
    ];
    if (S.back) out.push(it('arrow_back', 'Quay lại thư viện', goBack));
    out.push('sep', it('delete', 'Xóa', deleteCurrent, { off: !canDelete(), danger: true }));
    return out;
  }
  return [it('', 'Mở ảnh...', pickFiles), it('folder_open', 'Mở thư mục...', pickDir), 'sep', it(isFs() ? 'fullscreen_exit' : 'fullscreen', isFs() ? 'Thoát toàn màn hình' : 'Toàn màn hình', toggleFs)];
}
window.addEventListener('contextmenu', e => {
  e.preventDefault();
  if ($('#dlg').open || S.tool === 'draw' || e.target.closest('#textBox')) return;
  const items = ctxItems(e);
  cm.open = false; cm.textContent = '';
  items.forEach(i => {
    if (i === 'sep') { const d = document.createElement('md-divider'); d.setAttribute('role', 'separator'); cm.appendChild(d); return; }
    const m = document.createElement('md-menu-item'); m.disabled = !!i.off;
    if (i.danger) m.style.setProperty('--md-menu-item-label-text-color', 'var(--md-sys-color-error)');
    m.innerHTML = `${i.icon ? `<md-icon slot="start" data-i="${i.icon}"></md-icon>` : '<span slot="start" class="ctxgap"></span>'}<div slot="headline">${esc(i.label)}</div>`;
    m.addEventListener('click', () => setTimeout(i.fn, 0));
    cm.appendChild(m);
  });
  paintIcons(cm);
  const eh = items.reduce((n, i) => n + (i === 'sep' ? 18 : 48), 24);
  ctxAnchor.style.left = Math.max(8, Math.min(e.clientX, innerWidth - 236)) + 'px'; ctxAnchor.style.top = Math.max(8, Math.min(e.clientY, innerHeight - eh - 8)) + 'px';
  requestAnimationFrame(() => { cm.open = true; });
}, true);

/* Cho phép kiểm thử tự động */
window.__photos = { S, GAL, openList, setTool };
})();
