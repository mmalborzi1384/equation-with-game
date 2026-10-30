/* Part 7 lab UI: theme, fraction mode, simplification, negation, equation discovery. */
(function () {
  'use strict';
  const M = window.HNLMath;
  const $ = id => document.getElementById(id);
  if (!M || !$('tab-simplify')) return;
  const fa = M.fa;
  const math = (tex, plain) => window.labMathHTML ? labMathHTML(tex, plain) : '<span class="math-render">' + String(plain).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) + '</span>';
  const refreshGlass = () => { document.dispatchEvent(new Event('hnl:glass-refresh')); if (window.GlisseLiquid) GlisseLiquid.mount().refresh(); };

  /* Theme */
  const themeBtn = $('btnTheme'), meta = $('metaTheme');
  function syncTheme() {
    const t = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    themeBtn.setAttribute('aria-pressed', String(t === 'light'));
    themeBtn.setAttribute('aria-label', t === 'light' ? 'تغییر به حالت شب' : 'تغییر به حالت روز');
    themeBtn.title = themeBtn.getAttribute('aria-label');
    if (meta) meta.content = t === 'light' ? '#F8FAFC' : '#0F172A';
    refreshGlass();
  }
  themeBtn.addEventListener('click', () => {
    const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('hnl-theme', t); } catch (e) {}
    syncTheme();
  });
  syncTheme();

  /* Fraction / integer mode */
  const modeBar = $('numberMode'), modeBtns = Array.from(modeBar.querySelectorAll('button'));
  const fractionTools = $('fractionTools');
  function placeModeIndicator() {
    const active = modeBar.querySelector('button[aria-pressed="true"]');
    const ind = modeBar.querySelector('.segmented-indicator');
    if (!active || !ind) return;
    const br = modeBar.getBoundingClientRect(), r = active.getBoundingClientRect();
    ind.style.width = r.width + 'px';
    ind.style.height = r.height + 'px';
    ind.style.transform = 'translate3d(' + (r.left - br.left - modeBar.clientLeft) + 'px,' + (r.top - br.top - modeBar.clientTop) + 'px,0)';
    document.dispatchEvent(new Event('hnl:segment-selected'));
  }
  function setMode(mode) {
    if (state.status === 'running') stopRun();
    state.mode = mode; state.posExact = null;
    modeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    fractionTools.hidden = mode !== 'fraction';
    els.expr.placeholder = mode === 'fraction' ? 'مثلاً ۱/۲+۱/۳ یا x/۲+۱=۳' : 'مثلاً  ۲×(۳+۴)  یا  ۲+۳x=۱۱…';
    els.expr.value = mode === 'fraction' ? '۱/۲+۱/۳' : MINUS + '۳+۵';
    clearExprError(); resetRun(); setPos(0, 0); setFace(1);
    try { const plan = mode === 'fraction' ? M.fractionPlan(els.expr.value) : buildPlan(els.expr.value); renderExpr(plan); setRange(plan.range, plan.tickStep); } catch (e) {}
    placeModeIndicator(); refreshGlass();
  }
  modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  window.addEventListener('resize', placeModeIndicator);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeModeIndicator);

  function renderExamples(containerId, list, onPick) {
    const box = $(containerId); if (!box) return;
    box.innerHTML = list.map((e, i) => '<button type="button" class="example-chip" data-glass="control" data-i="' + i + '"><span class="n">' + String(e).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) + '</span></button>').join('');
    box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => onPick(list[+b.dataset.i])));
  }
  renderExamples('fractionExamples', M.EXAMPLES.fraction, e => { els.expr.value = e; clearExprError(); preview(); });
  renderExamples('simplifyExamples', M.EXAMPLES.simplify, e => { $('simplifyInput').value = e; runSimplify(); });
  renderExamples('negateExamples', M.EXAMPLES.negate, e => { $('negateInput').value = e; runNegate(); });
  renderExamples('discoverExamples', M.EXAMPLES.discover, e => { $('discoverInput').value = e; loadDiscovery(); });

  function showSteps(outId, result) {
    const out = $(outId);
    out.innerHTML = '<div class="lab-result">' + math(result.tex, result.plain) + '</div><div class="step-list">' +
      result.steps.map((s, i) => '<div class="step-card" style="--step-i:' + i + '"><h4>' + s.title + '</h4><div class="step-math">' + math(s.math, s.math) + '</div><p>' + s.note + '</p></div>').join('') + '</div>';
    refreshGlass();
  }
  function labError(inputId, errId, e) {
    const inp = $(inputId), box = $(errId);
    box.textContent = e.message || 'عبارت نامعتبر است.'; box.hidden = false;
    inp.setAttribute('aria-invalid', 'true');
    if (window.toast) toast(box.textContent, true);
  }
  function clearLabError(inputId, errId) { $(inputId).removeAttribute('aria-invalid'); $(errId).hidden = true; }
  function runSimplify() {
    clearLabError('simplifyInput', 'simplifyError');
    try { showSteps('simplifyOutput', M.simplify($('simplifyInput').value)); }
    catch (e) { labError('simplifyInput', 'simplifyError', e); }
  }
  function runNegate() {
    clearLabError('negateInput', 'negateError');
    try { showSteps('negateOutput', M.negate($('negateInput').value)); }
    catch (e) { labError('negateInput', 'negateError', e); }
  }
  $('simplifyRun').addEventListener('click', runSimplify);
  $('negateRun').addEventListener('click', runNegate);
  $('simplifyReset').addEventListener('click', () => { $('simplifyInput').value = '2x+5-(6+8x)'; clearLabError('simplifyInput', 'simplifyError'); $('simplifyOutput').innerHTML = '<p class="tl-hint">یک عبارت بنویس و «ساده کن» را بزن.</p>'; });
  $('negateReset').addEventListener('click', () => { $('negateInput').value = '5x-6'; clearLabError('negateInput', 'negateError'); $('negateOutput').innerHTML = '<p class="tl-hint">یک عبارت بنویس و «قرینه کن» را بزن.</p>'; });
  ['simplifyInput', 'negateInput'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') (id === 'simplifyInput' ? runSimplify : runNegate)(); }));

  /* Discovery balance */
  let D = null;
  function parseSide(s) { const l = M.linear(M.parse(s)); return l; }
  function loadDiscovery() {
    clearLabError('discoverInput', 'discoverError');
    try {
      const raw = M.normalize($('discoverInput').value); const parts = raw.split('=');
      if (parts.length !== 2) throw new Error('معادله باید دقیقاً یک علامت = داشته باشد.');
      const L = parseSide(parts[0]), R = parseSide(parts[1]);
      D = { L, R, L0: L, R0: R, log: [], solved: false, scored: false };
      $('discoverLog').innerHTML = '';
      renderDiscovery();
      setStatus('ترازو آماده است؛ با کم‌کردن هم‌زمان از دو کفه، x را تنها کن.', 'try');
    } catch (e) { labError('discoverInput', 'discoverError', e); }
  }
  function setStatus(msg, kind) { const el = $('discoverStatus'); el.textContent = msg; el.className = 'discovery-status ' + (kind || 'try'); }
  function itemsHtml(l) {
    let h = '';
    const a = l.a, b = l.b;
    if (!M.isZero(a)) {
      const n = Math.abs(a.n / a.d);
      if (a.d === 1 && n <= 8) for (let i = 0; i < n; i++) h += '<span class="xbox' + (a.n < 0 ? ' neg' : '') + '" aria-hidden="true">' + (a.n < 0 ? '−x' : 'x') + '</span>';
      else h += '<span class="xbox' + (a.n < 0 ? ' neg' : '') + '">' + math(M.tex(a) + 'x', M.plain(a) + 'x') + '</span>';
    }
    if (!M.isZero(b)) {
      const n = Math.abs(b.n / b.d);
      if (b.d === 1 && n <= 12) for (let i = 0; i < n; i++) h += '<span class="unit' + (b.n < 0 ? ' neg' : '') + '" aria-hidden="true">' + (b.n < 0 ? '−۱' : '۱') + '</span>';
      else h += '<span class="unit-more">' + math(M.tex(b, true), M.plain(b, true)) + '</span>';
    }
    if (!h) h = '<span class="unit-more">۰</span>';
    return h;
  }
  function renderDiscovery() {
    if (!D) return;
    $('balanceEquation').innerHTML = math(M.linTex(D.L) + '=' + M.linTex(D.R), M.linPlain(D.L) + '=' + M.linPlain(D.R));
    $('panLeft').querySelector('.pan-items').innerHTML = itemsHtml(D.L);
    $('panRight').querySelector('.pan-items').innerHTML = itemsHtml(D.R);
    const guess = parseFloat($('guessInput').value.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace('٫', '.')) || 0;
    const diff = M.toNum(M.sub(M.add(M.mul(D.L.a, M.F(Math.round(guess * 1000), 1000)), D.L.b), M.add(M.mul(D.R.a, M.F(Math.round(guess * 1000), 1000)), D.R.b)));
    $('balanceBeam').style.transform = 'rotate(' + Math.max(-8, Math.min(8, diff * 1.5)) + 'deg)';
    const solved = (D.L.a.n === 1 && D.L.a.d === 1 && M.isZero(D.L.b) && M.isZero(D.R.a)) || (D.R.a.n === 1 && D.R.a.d === 1 && M.isZero(D.R.b) && M.isZero(D.L.a));
    if (!D.solved && M.isZero(D.L.a) && M.isZero(D.R.a)) { D.solved = true; const same = M.cmp(D.L.b, D.R.b) === 0; setStatus(same ? 'هر عددی جواب است؛ دو کفه همیشه برابرند. ∞' : 'جواب ندارد؛ دو کفه هیچ‌وقت برابر نمی‌شوند. ✗', same ? 'ok' : 'try'); if (same && !D.scored) { D.scored = true; setScore(state.score + 1); } }
    $('opRemoveX').disabled = D.solved || M.isZero(D.L.a) || M.isZero(D.R.a);
    $('opRemoveUnit').disabled = D.solved || !((!M.isZero(D.L.a) && !M.isZero(D.L.b)) || (!M.isZero(D.R.a) && !M.isZero(D.R.b)));
    const oneX = (!M.isZero(D.L.a) && M.isZero(D.R.a)) || (M.isZero(D.L.a) && !M.isZero(D.R.a));
    $('opDivide').disabled = D.solved || !oneX;
    if (solved && !D.solved) {
      D.solved = true;
      const v = M.isZero(D.L.a) ? D.L.b : D.R.b;
      setStatus('آفرین! x = ' + M.plain(v) + '؛ ترازو کاملاً متعادل است.', 'ok');
      if (!D.scored) { D.scored = true; setScore(state.score + 1); }
      if (typeof sOk === 'function') sOk(); if (window.cheer) cheer();
    }
    refreshGlass();
  }
  function logOp(title, tex) {
    D.log.push({ title, tex });
    $('discoverLog').innerHTML = D.log.map(s => '<div class="step-card"><h4>' + s.title + '</h4><div class="step-math">' + math(s.tex, s.tex) + '</div></div>').join('');
  }
  $('discoverLoad').addEventListener('click', loadDiscovery);
  $('discoverReset').addEventListener('click', () => { if (D) { D.L = D.L0; D.R = D.R0; D.log = []; D.solved = false; $('discoverLog').innerHTML = ''; renderDiscovery(); setStatus('دوباره از معادلهٔ اول شروع کن.', 'try'); } });
  $('opRemoveX').addEventListener('click', () => {
    if (!D || D.solved) return;
    const m = M.cmp(D.L.a, D.R.a) <= 0 ? D.L.a : D.R.a;
    D.L = { a: M.sub(D.L.a, m), b: D.L.b }; D.R = { a: M.sub(D.R.a, m), b: D.R.b };
    logOp('از دو طرف ' + M.plain(m) + 'x کم شد', M.linTex(D.L) + '=' + M.linTex(D.R)); renderDiscovery();
  });
  $('opRemoveUnit').addEventListener('click', () => {
    if (!D || D.solved) return;
    const side = !M.isZero(D.L.a) && !M.isZero(D.L.b) ? 'L' : 'R';
    const c = side === 'L' ? D.L.b : D.R.b;
    D.L = { a: D.L.a, b: M.sub(D.L.b, c) }; D.R = { a: D.R.a, b: M.sub(D.R.b, c) };
    logOp('از دو طرف ' + M.plain(c) + ' کم شد', M.linTex(D.L) + '=' + M.linTex(D.R)); renderDiscovery();
  });
  $('opDivide').addEventListener('click', () => {
    if (!D || D.solved) return;
    const coef = !M.isZero(D.L.a) ? D.L.a : D.R.a;
    D.L = { a: M.div(D.L.a, coef), b: M.div(D.L.b, coef) }; D.R = { a: M.div(D.R.a, coef), b: M.div(D.R.b, coef) };
    logOp('دو طرف بر ' + M.plain(coef) + ' تقسیم شد', M.linTex(D.L) + '=' + M.linTex(D.R)); renderDiscovery();
  });
  $('guessSlider').addEventListener('input', () => { $('guessInput').value = fa($('guessSlider').value); if (D) renderDiscovery(); });
  $('guessCheck').addEventListener('click', () => {
    if (!D) { setStatus('اول یک معادله بارگذاری کن.', 'try'); return; }
    try {
      const g = M.linear(M.parse($('guessInput').value));
      if (!M.isZero(g.a)) throw new Error('حدس باید یک عدد یا کسر باشد، نه عبارت شامل x.');
      const x = g.b;
      const lv = M.add(M.mul(D.L0.a, x), D.L0.b), rv = M.add(M.mul(D.R0.a, x), D.R0.b);
      if (M.cmp(lv, rv) === 0) { setStatus('درست است! x = ' + M.plain(x) + ' معادله را برقرار می‌کند.', 'ok'); if (!D.scored) { D.scored = true; setScore(state.score + 1); } if (typeof sOk === 'function') sOk(); }
      else setStatus('هنوز نه؛ دو طرف برابر نیستند. با ترازو ادامه بده یا حدس دیگری بزن.', 'try');
    } catch (e) { setStatus(e.message || 'حدس نامعتبر است.', 'try'); }
  });
  $('discoverInput').addEventListener('keydown', e => { if (e.key === 'Enter') loadDiscovery(); });

  placeModeIndicator();
  loadDiscovery();
  refreshGlass();
})();
