// The deck: state registry, beats, navigation, stage scaling, the render loop and window.__deck.
(function () {
  'use strict';
  const Deck = window.Deck, { W, H, N, TOTAL } = Deck;
  const defs = {}, shared = {}, layouts = new Map();
  let canvas, ctx, stage, layer, scale = 1;
  let cur = { n: 0, beat: 0 }, ready = false, raf = 0, liveFn = null, settledAt = 0, settled = false;

  // Deck.state(n, def) registers state n (1..14). See DESIGN.md, "Engine interface".
  //   def { setup() -> s, beats: [{ layout(s), caption | caption(s), enter(s, info), live(t, frame, s), stillAt, move }] }
  Deck.state = function (n, def) {
    if (!def || !Array.isArray(def.beats) || !def.beats.length) throw new Error(`[deck] state ${n} needs at least one beat`);
    defs[n] = def;
  };
  Deck.demos = {}; // name -> def, shown with ?demo=name (engine demos, not part of the 14 states)

  function placeholder(n) {
    return {
      beats: [{ layout: () => Deck.layout(Deck.pts.number(n)), caption: { labels: [{ text: 'состояние в работе', x: Deck.MARGIN, y: 48 }] }, move: { stagger: 'x' } }],
    };
  }
  const defOf = (n) => (Deck.demo && Deck.demos[Deck.demo]) || defs[n] || (defs[n] = placeholder(n));
  const keyOf = (n) => (Deck.demo ? 'demo' : n);

  function sharedOf(n) {
    const k = keyOf(n);
    if (!(k in shared)) {
      const def = defOf(n);
      shared[k] = (def.setup && def.setup()) || {};
    }
    return shared[k];
  }

  function layoutOf(n, beat) {
    const k = keyOf(n) + ':' + beat;
    if (!layouts.has(k)) {
      const L = defOf(n).beats[beat].layout(sharedOf(n));
      if (!L || !L.x || L.x.length !== N) throw new Error(`[deck] state ${n} beat ${beat}: layout() must return Deck.layout(...)`);
      layouts.set(k, L);
    }
    return layouts.get(k);
  }

  const captionOf = (n, beat) => {
    const c = defOf(n).beats[beat].caption;
    return typeof c === 'function' ? c(sharedOf(n)) : c;
  };

  // The step before (n, beat) in presentation order, or null at the very start.
  function before(n, beat) {
    if (beat > 0) return { n, beat: beat - 1 };
    if (n > 1) return { n: n - 1, beat: defOf(n - 1).beats.length - 1 };
    return null;
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function loop(now) {
    raf = 0;
    let active = Deck.dots.step(now);
    if (!active) {
      if (!settled) { settled = true; settledAt = now; }
      if (liveFn) {
        Deck.dots.rest();
        if (liveFn((now - settledAt) / 1000, Deck.dots.cur, sharedOf(cur.n)) === false) liveFn = null;
        else active = true;
      }
    }
    Deck.dots.draw(ctx);
    if (active) kick();
  }

  // Go to state n, beat b. opts { instant, dir (+1 forward, -1 back, 0 jump) }
  function go(n, beat, opts) {
    if (!ready) return;
    const o = Object.assign({ instant: false, dir: 0 }, opts);
    n = Deck.clamp(Math.round(n) || 1, 1, TOTAL);
    const def = defOf(n);
    beat = Deck.clamp(Math.round(beat) || 0, 0, def.beats.length - 1);
    const b = def.beats[beat], s = sharedOf(n), L = layoutOf(n, beat);
    const instant = o.instant || Deck.still || matchMedia('(prefers-reduced-motion: reduce)').matches;
    Deck.sound.stop();
    cur = { n, beat };
    settled = false;
    if (instant) Deck.dots.set(L);
    else Deck.dots.move(L, o.dir < 0 && b.moveBack ? b.moveBack : b.move, performance.now());
    Deck.captions.show(captionOf(n, beat), instant);
    Deck.captions.counter(n, beat, def.beats.length);
    liveFn = Deck.still ? null : b.live || null;
    if (Deck.still) {
      // one reproducible frame: the settled target, or the beat's chosen instant of its live motion
      if (b.live && b.stillAt != null) b.live(b.stillAt, Deck.dots.cur, s);
      Deck.dots.draw(ctx);
      settled = true;
    } else {
      if (b.enter) b.enter(s, { dir: o.dir });
      kick();
    }
    try { history.replaceState(null, '', '#' + n); } catch (e) { /* file:// in some browsers */ }
  }

  function forward() {
    const beats = defOf(cur.n).beats.length;
    if (cur.beat < beats - 1) go(cur.n, cur.beat + 1, { dir: 1 });
    else if (cur.n < TOTAL) go(cur.n + 1, 0, { dir: 1 });
  }
  function back() {
    const p = before(cur.n, cur.beat);
    if (p) go(p.n, p.beat, { dir: -1 });
  }

  function fit() {
    scale = Math.min(innerWidth / W, innerHeight / H);
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    stage.style.width = W * scale + 'px';
    stage.style.height = H * scale + 'px';
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    layer.style.transform = `scale(${scale})`;
    if (ready) Deck.dots.draw(ctx);
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    Deck.sound.unlock();
    const inControl = e.target && e.target.closest && e.target.closest('[data-role="control"]');
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || ((k === ' ' || k === 'Enter') && !inControl)) forward();
    else if (k === 'ArrowLeft' || k === 'PageUp' || (k === 'Backspace' && !inControl)) back();
    else if (k === 'Home') go(1, 0);
    else if (k === 'End') go(TOTAL, 0);
    else if (k === 'f' || k === 'F' || k === 'а' || k === 'А') {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    } else if (k === 'm' || k === 'M' || k === 'ь' || k === 'Ь') {
      Deck.sound.setMuted(!Deck.muted);
      Deck.captions.counter(cur.n, cur.beat, defOf(cur.n).beats.length);
    } else return;
    e.preventDefault();
  }

  function onTap(e) {
    Deck.sound.unlock();
    if (e.target.closest && e.target.closest('[data-role="control"], a, button, input')) return;
    if (e.clientX < innerWidth / 2) back();
    else forward();
  }

  function fromHash() {
    const m = /^#(\d+)(?:\.(\d+))?$/.exec(location.hash);
    return m ? { n: +m[1], beat: +(m[2] || 0) } : { n: 1, beat: 0 };
  }

  // The hook for checks and render tools (contract).
  window.__deck = {
    get state() { return cur.n; },
    get beat() { return cur.beat; },
    get beats() { return cur.n ? defOf(cur.n).beats.length : 0; },
    total: TOTAL,
    get settled() { return ready && settled && !Deck.dots.moving; },
    get dotCount() { return Deck.dots.count(); },
    go(n, beat) { go(n, beat || 0, { dir: 0 }); },
    // Not part of the contract: a frozen mid-transition frame for render tools. Shows the step
    // before (n, beat), starts the move into (n, beat) and stops it at share p of its duration.
    mid(n, beat, p) {
      const prev = before(n, beat || 0);
      if (!prev) return false;
      const b = defOf(n).beats[beat || 0];
      Deck.dots.set(layoutOf(prev.n, prev.beat));
      Deck.dots.move(layoutOf(n, beat || 0), b.move, 0);
      Deck.dots.freeze(p == null ? 0.5 : p);
      cur = { n, beat: beat || 0 };
      Deck.captions.show(captionOf(n, beat || 0), true);
      Deck.captions.counter(n, beat || 0, defOf(n).beats.length);
      Deck.dots.draw(ctx);
      return true;
    },
  };

  async function boot() {
    stage = document.getElementById('stage');
    canvas = document.getElementById('dots');
    layer = document.getElementById('captions');
    ctx = canvas.getContext('2d');
    Deck.captions.init(layer);
    fit();
    addEventListener('resize', fit);
    // the glyph sampler draws with the text face, so the faces must be in before the first layout
    const faces = [`900 64px "${Deck.FONT_DOTS}"`, `600 64px "${Deck.FONT_TEXT}"`, `400 24px "${Deck.FONT_TEXT}"`, `italic 400 24px "${Deck.FONT_TEXT}"`, `400 15px "${Deck.FONT_MONO}"`];
    try {
      await Promise.race([Promise.all(faces.map((f) => document.fonts.load(f, 'домбра Әә 0'))), new Promise((r) => setTimeout(r, 4000))]);
    } catch (e) { /* fall through with system faces */ }
    ready = true;
    const h = fromHash();
    go(h.n, h.beat, { instant: true });
    addEventListener('keydown', onKey);
    addEventListener('click', onTap); // the whole window: left half back, right half forward
    addEventListener('hashchange', () => {
      const t = fromHash();
      if (t.n !== cur.n) go(t.n, t.beat);
    });
  }

  Deck.boot = function () {
    if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
    else boot();
  };
})();
