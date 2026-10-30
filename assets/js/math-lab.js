/* HNL Math Lab — exact rational linear algebra, independent of the locked integer engine.
 * Part 7. No DOM. MIT-style project code; keeps the original parser/solver untouched. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HNLMath = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const fa = s => String(s).replace(/[0-9]/g, d => FA[+d]);
  const en = s => String(s).replace(/[۰-۹]/g, d => String(FA.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; };
  function F(n, d) {
    if (d === undefined) d = 1;
    if (!Number.isInteger(n) || !Number.isInteger(d)) throw new Error('کسر باید از عددهای صحیح ساخته شود.');
    if (d === 0) throw new Error('مخرج کسر نمی‌تواند صفر باشد.');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d); n /= g; d /= g;
    if (Math.abs(n) > 1e7 || d > 1e7) throw new Error('عددها خیلی بزرگ شدند؛ عبارت کوچک‌تری امتحان کن.');
    return { n, d };
  }
  const add = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
  const sub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
  const mul = (a, b) => F(a.n * b.n, a.d * b.d);
  const div = (a, b) => { if (b.n === 0) throw new Error('تقسیم بر صفر ممکن نیست.'); return F(a.n * b.d, a.d * b.n); };
  const neg = a => F(-a.n, a.d);
  const cmp = (a, b) => { const x = a.n * b.d - b.n * a.d; return x < 0 ? -1 : x > 0 ? 1 : 0; };
  const isZero = a => a.n === 0;
  const toNum = a => a.n / a.d;
  const abs = a => F(Math.abs(a.n), a.d);
  function plain(a, sign) {
    const s = a.n < 0 ? '−' : (sign && a.n > 0 ? '+' : '');
    const n = fa(Math.abs(a.n));
    return a.d === 1 ? s + n : s + n + '/' + fa(a.d);
  }
  function tex(a, sign) {
    const s = a.n < 0 ? '-' : (sign && a.n > 0 ? '+' : '');
    const n = String(Math.abs(a.n));
    return a.d === 1 ? s + n : s + '\\frac{' + n + '}{' + String(a.d) + '}';
  }
  function normalize(raw) {
    const s = en(String(raw == null ? '' : raw))
      .replace(/[\u2212\u2013\u2014]/g, '-')
      .replace(/[×⨯∙·*]/g, '*').replace(/[÷:]/g, '/')
      .replace(/X/g, 'x').replace(/ایکس/g, 'x')
      .replace(/[\s\u200c\u200e\u200f]/g, '');
    if (!s) throw new Error('عبارت خالی است.');
    if (s.length > 120) throw new Error('عبارت خیلی بلند است!');
    if (/[^0-9+\-*/=x()]/.test(s)) throw new Error('فقط عدد، کسر، پرانتز و عملگرهای + − × ÷ = x مجاز است.');
    return s;
  }
  function tokenize(s) {
    const out = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/[0-9]/.test(c)) { let j = i; while (j < s.length && /[0-9]/.test(s[j])) j++; const v = parseInt(s.slice(i, j), 10); if (v > 1000) throw new Error('عددها حداکثر تا ۱۰۰۰ باشند.'); out.push({ t: 'n', v }); i = j; continue; }
      if (c === 'x') { out.push({ t: 'x' }); i++; continue; }
      if (c === '=') { out.push({ t: 'eq' }); i++; continue; }
      if (c === '(') { out.push({ t: 'lp' }); i++; continue; }
      if (c === ')') { out.push({ t: 'rp' }); i++; continue; }
      if ('+-*/'.includes(c)) { out.push({ t: 'o', v: c }); i++; continue; }
      throw new Error('نویسهٔ نامعتبر در عبارت.');
    }
    if (!out.length) throw new Error('عبارت خالی است.');
    return out;
  }
  function parse(raw) {
    const tk = tokenize(normalize(raw)); let p = 0;
    function expr() { let a = term(); while (p < tk.length && tk[p].t === 'o' && (tk[p].v === '+' || tk[p].v === '-')) { const o = tk[p++].v; a = { k: 'op', o, a, b: term() }; } return a; }
    function term() {
      let a = factor();
      for (;;) {
        if (p < tk.length && tk[p].t === 'o' && (tk[p].v === '*' || tk[p].v === '/')) { const o = tk[p++].v; a = { k: 'op', o, a, b: factor() }; }
        else if (p < tk.length && (tk[p].t === 'lp' || tk[p].t === 'x' || (tk[p].t === 'n' && a.k === 'paren'))) { a = { k: 'op', o: '*', a, b: factor() }; }
        else break;
      }
      return a;
    }
    function factor() {
      const t = tk[p];
      if (!t) throw new Error('عبارت ناقص است.');
      if (t.t === 'o' && (t.v === '+' || t.v === '-')) { p++; const a = factor(); return t.v === '-' ? { k: 'neg', a } : a; }
      if (t.t === 'n') { p++; return { k: 'num', v: F(t.v) }; }
      if (t.t === 'x') { p++; return { k: 'x' }; }
      if (t.t === 'lp') { p++; const a = expr(); if (!tk[p] || tk[p].t !== 'rp') throw new Error('پرانتز باز را ببند! )'); p++; return { k: 'paren', a }; }
      throw new Error('ساختار عبارت را بررسی کن.');
    }
    const node = expr();
    if (p < tk.length) throw new Error('ساختار عبارت را بررسی کن.');
    return node;
  }
  function linear(node) {
    switch (node.k) {
      case 'num': return { a: F(0), b: node.v };
      case 'x': return { a: F(1), b: F(0) };
      case 'paren': return linear(node.a);
      case 'neg': { const l = linear(node.a); return { a: neg(l.a), b: neg(l.b) }; }
      case 'op': {
        const L = linear(node.a), R = linear(node.b);
        if (node.o === '+') return { a: add(L.a, R.a), b: add(L.b, R.b) };
        if (node.o === '-') return { a: sub(L.a, R.a), b: sub(L.b, R.b) };
        if (node.o === '*') {
          if (!isZero(L.a) && !isZero(R.a)) throw new Error('فعلاً فقط عبارت خطی پذیرفته می‌شود؛ x×x نداریم.');
          return { a: add(mul(L.a, R.b), mul(L.b, R.a)), b: mul(L.b, R.b) };
        }
        if (node.o === '/') {
          if (!isZero(R.a)) throw new Error('تقسیم بر عبارت شامل x در این بخش پشتیبانی نمی‌شود.');
          return { a: div(L.a, R.b), b: div(L.b, R.b) };
        }
      }
    }
    throw new Error('عبارت پشتیبانی نمی‌شود.');
  }
  function expand(node) {
    switch (node.k) {
      case 'num': return [{ c: node.v, v: 0 }];
      case 'x': return [{ c: F(1), v: 1 }];
      case 'paren': return expand(node.a);
      case 'neg': return expand(node.a).map(t => ({ c: neg(t.c), v: t.v }));
      case 'op': {
        const L = expand(node.a), R = expand(node.b);
        if (node.o === '+') return L.concat(R);
        if (node.o === '-') return L.concat(R.map(t => ({ c: neg(t.c), v: t.v })));
        if (node.o === '*') {
          const out = [];
          for (const a of L) for (const b of R) { if (a.v + b.v > 1) throw new Error('فعلاً فقط عبارت خطی پذیرفته می‌شود؛ x×x نداریم.'); out.push({ c: mul(a.c, b.c), v: a.v + b.v }); }
          return out;
        }
        if (node.o === '/') {
          if (R.some(t => t.v !== 0)) throw new Error('تقسیم بر عبارت شامل x در این بخش پشتیبانی نمی‌شود.');
          const d = R.reduce((s, t) => add(s, t.c), F(0));
          return L.map(t => ({ c: div(t.c, d), v: t.v }));
        }
      }
    }
    throw new Error('عبارت پشتیبانی نمی‌شود.');
  }
  function termTex(t, first) {
    const sign = t.c.n < 0 ? '-' : (first ? '' : '+');
    const a = abs(t.c);
    const coef = (a.n === 1 && a.d === 1 && t.v === 1) ? '' : tex(a);
    return sign + coef + (t.v === 1 ? 'x' : '');
  }
  function termsTex(terms) { return terms.map((t, i) => termTex(t, i === 0)).join('') || '0'; }
  function linTex(l) {
    const parts = [];
    if (!isZero(l.a)) parts.push(termTex({ c: l.a, v: 1 }, parts.length === 0));
    if (!isZero(l.b) || parts.length === 0) parts.push(termTex({ c: l.b, v: 0 }, parts.length === 0));
    return parts.join('');
  }
  function linPlain(l) {
    const parts = [];
    if (!isZero(l.a)) { const c = abs(l.a); const coef = (c.n === 1 && c.d === 1) ? '' : plain(c); parts.push((l.a.n < 0 ? '−' : '') + coef + 'x'); }
    if (!isZero(l.b) || parts.length === 0) parts.push(plain(l.b, parts.length > 0));
    return parts.join('');
  }
  function rawTex(raw) {
    return normalize(raw).replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}').replace(/\*/g, '\\times ').replace(/\//g, '\\div ');
  }
  function simplify(raw) {
    const node = parse(raw); const terms = expand(node); const l = linear(node);
    const xs = terms.filter(t => t.v === 1).reduce((s, t) => add(s, t.c), F(0));
    const cs = terms.filter(t => t.v === 0).reduce((s, t) => add(s, t.c), F(0));
    const steps = [
      { title: 'عبارت اصلی', math: rawTex(raw), note: 'اول ساختار عبارت را می‌خوانیم.' },
      { title: 'باز کردن پرانتزها', math: termsTex(terms), note: 'علامت‌ها و ضریب‌ها را بین جمله‌ها پخش می‌کنیم.' },
      { title: 'جمله‌های هم‌جنس', math: '(' + tex(xs) + ')x + (' + tex(cs) + ')', note: 'جمله‌های xدار و عددهای ثابت را جدا جمع می‌کنیم.' },
      { title: 'نتیجهٔ ساده‌شده', math: linTex(l), note: 'دو عبارت برای هر مقدار x برابرند.' }
    ];
    return { input: raw, result: l, tex: linTex(l), plain: linPlain(l), steps };
  }
  function rawPlain(raw) { return fa(String(raw)).replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−'); }
  function negate(raw) {
    const node = parse(raw); const terms = expand(node); const flipped = terms.map(t => ({ c: neg(t.c), v: t.v }));
    const l = linear({ k: 'neg', a: node });
    return { input: raw, result: l, tex: linTex(l), plain: linPlain(l), steps: [
      { title: 'قرینهٔ عبارت', math: '-(' + rawTex(raw) + ')', note: 'قرینه یعنی علامت تک‌تک جمله‌ها عوض شود.' },
      { title: 'پخش علامت منفی', math: termsTex(flipped), note: 'مثبت منفی می‌شود و منفی مثبت.' },
      { title: 'نتیجه', math: linTex(l), note: 'این عبارت، قرینهٔ عبارت اول است.' }
    ] };
  }
  function solveEquation(raw) {
    const s = normalize(raw); const parts = s.split('=');
    if (parts.length !== 2) throw new Error('معادله باید دقیقاً یک علامت = داشته باشد.');
    const L = linear(parse(parts[0])), R = linear(parse(parts[1]));
    const a = sub(L.a, R.a), b = sub(R.b, L.b);
    const steps = [{ title: 'معادلهٔ اصلی', math: linTex(L) + '=' + linTex(R), note: 'دو طرف معادله را مثل دو کفهٔ ترازو می‌بینیم.' }];
    if (!isZero(R.a)) steps.push({ title: 'حذف x از یک طرف', math: linTex({ a, b: L.b }) + '=' + linTex({ a: F(0), b: R.b }), note: 'از دو طرف به یک اندازه x کم می‌کنیم.' });
    if (!isZero(L.b)) steps.push({ title: 'حذف عدد ثابت', math: linTex({ a, b: F(0) }) + '=' + tex(b), note: 'از دو طرف به یک اندازه عدد ثابت کم می‌کنیم.' });
    if (isZero(a)) {
      if (isZero(b)) return { kind: 'identity', steps, tex: '\\text{هر عددی}', plain: 'هر عددی جواب است' };
      return { kind: 'none', steps, tex: '\\text{جواب ندارد}', plain: 'جواب ندارد' };
    }
    const x = div(b, a);
    steps.push({ title: 'تقسیم دو طرف', math: 'x=' + tex(x), note: 'دو طرف را بر ضریب x تقسیم می‌کنیم.' });
    return { kind: 'one', value: x, steps, tex: 'x=' + tex(x), plain: 'x=' + plain(x) };
  }
  function niceRange(maxAbs) {
    const m = Math.max(2, Math.ceil(maxAbs + 0.5));
    return Math.min(100, m);
  }
  function fractionPlan(raw) {
    const s = normalize(raw); const isEq = s.includes('=');
    const tokens = tokenize(s).map(t => t.t === 'n' ? { t: 'n', v: t.v, f: F(t.v) } : t);
    if (isEq) {
      const sol = solveEquation(raw);
      if (sol.kind !== 'one') return { type: 'fraction-eq', special: sol.kind, tokens, range: 5, tickStep: F(1, 2), actions: [{ k: 'reveal', verdict: sol.kind === 'identity' ? 'inf' : 'none', narr: { h: sol.plain }, chip: sol.plain, final: true }], flipIdxs: [] };
      const v = sol.value, maxAbs = Math.max(Math.abs(toNum(v)), 2);
      const range = niceRange(maxAbs); const tickStep = range <= 2 ? F(1, 4) : range <= 5 ? F(1, 2) : F(1);
      const actions = sol.steps.map((st, i) => ({ k: i === sol.steps.length - 1 ? 'walkTo' : 'note', to: toNum(v), exact: v, tok: [], narr: { h: st.note }, chip: st.title, chipTex: st.math, noMark: true }));
      actions.push({ k: 'reveal', verdict: 'ok', val: toNum(v), valExact: v, tok: [], narr: { h: 'جواب معادله روی محور پیدا شد.' }, chip: 'x=' + plain(v), chipTex: 'x=' + tex(v), final: true, noMark: true });
      return { type: 'fraction-eq', tokens, range, tickStep, actions, flipIdxs: [], solution: v };
    }
    const l = linear(parse(raw));
    if (!isZero(l.a)) throw new Error('برای عبارت شامل x از بخش ساده‌سازی یا کشف معادله استفاده کن.');
    const v = l.b; const range = niceRange(Math.abs(toNum(v))); const tickStep = range <= 2 ? F(1, 4) : range <= 5 ? F(1, 2) : F(1);
    const terms = expand(parse(raw));
    const actions = [
      { k: 'start', val: 0, exact: F(0), tok: [], narr: { h: 'از صفر شروع می‌کنیم و جمله‌های کسری را قدم‌به‌قدم می‌پیماییم.' }, chip: 'شروع از ۰', chipTex: '0', noMark: true },
      { k: 'walkTo', to: toNum(v), exact: v, tok: [], narr: { h: 'جمع دقیق کسرها: ' + plain(v) }, chip: 'جمع دقیق کسرها', chipTex: termsTex(terms) + '=' + tex(v), final: true, noMark: true },
      { k: 'reveal', verdict: 'ok', val: toNum(v), valExact: v, tok: [], narr: { h: 'نتیجهٔ دقیق کسری روی محور.' }, chip: plain(v), chipTex: tex(v), final: true, noMark: true }
    ];
    return { type: 'fraction', tokens, range, tickStep, actions, flipIdxs: [], solution: v };
  }
  const EXAMPLES = {
    fraction: ['۱/۲+۱/۳', '۳/۴−۱/۲', '۲×(۱/۴+۱/۲)', 'x/۲+۱=۳', '۲x/۳−۱=۱/۳'],
    simplify: ['2x+5-(6+8x)', '3(x+2)-4', '۱/۲x+۳−۱/۴x', '5-2(x-3)'],
    negate: ['5x-6', '2x+3', '-(x-4)', '۱/۲x−۳'],
    discover: ['2x+3=11', '3x-4=x+6', 'x/2+1=3', '2(x+1)=x+5', '۴x−۲=۲x+۶']
  };
  return { F, add, sub, mul, div, neg, cmp, isZero, toNum, abs, plain, tex, normalize, tokenize, parse, linear, expand, simplify, negate, solveEquation, fractionPlan, linTex, linPlain, termsTex, EXAMPLES, fa, en };
});
