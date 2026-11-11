// The dot store: 4096 dots that keep their identity for the whole deck, the transition that
// carries every dot from where it is to its new target, and the canvas painter.
(function () {
  'use strict';
  const Deck = window.Deck, N = Deck.N, TAU = Math.PI * 2;
  const arr = () => ({ x: new Float32Array(N), y: new Float32Array(N), r: new Float32Array(N), c: new Uint8Array(N) });
  const cur = arr(), from = arr(), to = arr();
  const delay = new Float32Array(N), ctrlX = new Float32Array(N), ctrlY = new Float32Array(N);
  let t0 = 0, total = 0, span = 1, moving = false, ease = Deck.ease.inOut;

  const copy = (a, b) => { b.x.set(a.x); b.y.set(a.y); b.r.set(a.r); b.c.set(a.c); };

  const dots = (Deck.dots = {
    cur, // what is drawn this frame; a beat's live() may nudge it
    to, // the settled target

    // Jump to a layout with no motion.
    set(L) {
      copy(L, to);
      copy(L, cur);
      moving = false;
    },

    // Start a transition from the drawn positions to layout L.
    //   move { ms = 1200, stagger = 'x', spread = 0.45, curl = 0.14, ease = 'inOut',
    //          dir = 0 (degrees, for 'x'), origin = [640, 360] (for 'radial') }
    //   stagger: 'x' a front sweeps across the stage along `dir`; 'radial' outward from `origin`;
    //            'index' in dot order (token by token); 'none' all together;
    //            or a function (i, fromX, fromY, toX, toY) -> 0..1.
    // Neighbours share a delay, so they leave together; every dot bows the same way (curl),
    // so the field turns like a flock; then everything lands exactly on target and stops.
    move(L, move, now) {
      const o = Object.assign({ ms: 1200, stagger: 'x', spread: 0.45, curl: 0.14, ease: 'inOut', dir: 0, origin: [Deck.W / 2, Deck.H / 2] }, move);
      copy(cur, from);
      copy(L, to);
      ease = Deck.ease[o.ease] || Deck.ease.inOut;
      const th = (o.dir * Math.PI) / 180, dx = Math.cos(th), dy = Math.sin(th);
      const key = new Float32Array(N);
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < N; i++) {
        let k = 0;
        if (typeof o.stagger === 'function') k = o.stagger(i, from.x[i], from.y[i], to.x[i], to.y[i]);
        else if (o.stagger === 'x') k = from.x[i] * dx + from.y[i] * dy;
        else if (o.stagger === 'radial') k = Math.hypot(from.x[i] - o.origin[0], from.y[i] - o.origin[1]);
        else if (o.stagger === 'index') k = i;
        key[i] = k;
        if (k < lo) lo = k;
        if (k > hi) hi = k;
      }
      const range = hi - lo || 1, jitter = 0.05;
      total = o.ms;
      span = o.ms * (1 - o.spread - jitter);
      for (let i = 0; i < N; i++) {
        delay[i] = (((key[i] - lo) / range) * o.spread + Deck.hash(i, 9) * jitter) * o.ms;
        const mx = to.x[i] - from.x[i], my = to.y[i] - from.y[i];
        ctrlX[i] = (from.x[i] + to.x[i]) / 2 - my * o.curl;
        ctrlY[i] = (from.y[i] + to.y[i]) / 2 + mx * o.curl;
      }
      t0 = now;
      moving = true;
    },

    // Advance the transition to time `now`. Returns true while dots are still travelling.
    step(now) {
      if (!moving) return false;
      const t = now - t0;
      if (t >= total) {
        copy(to, cur);
        moving = false;
        return false;
      }
      for (let i = 0; i < N; i++) {
        const u = Deck.clamp((t - delay[i]) / span, 0, 1);
        if (u <= 0) { cur.x[i] = from.x[i]; cur.y[i] = from.y[i]; cur.r[i] = from.r[i]; cur.c[i] = from.c[i]; continue; }
        if (u >= 1) { cur.x[i] = to.x[i]; cur.y[i] = to.y[i]; cur.r[i] = to.r[i]; cur.c[i] = to.c[i]; continue; }
        const e = ease(u), a = (1 - e) * (1 - e), b = 2 * e * (1 - e), c = e * e;
        cur.x[i] = a * from.x[i] + b * ctrlX[i] + c * to.x[i];
        cur.y[i] = a * from.y[i] + b * ctrlY[i] + c * to.y[i];
        cur.r[i] = from.r[i] + (to.r[i] - from.r[i]) * e;
        cur.c[i] = e < 0.5 ? from.c[i] : to.c[i]; // inks do not blend: a dot changes ink mid-flight
      }
      return true;
    },

    // Freeze the running transition at a share p (0..1) of its duration (for mid-transition stills).
    freeze(p) {
      dots.step(t0 + Deck.clamp(p, 0, 0.999) * total);
      moving = false;
    },

    rest() { copy(to, cur); },
    get moving() { return moving; },

    // Dots that a viewer can actually see: on the stage and not shrunk away. Must stay 4096.
    count() {
      let n = 0;
      for (let i = 0; i < N; i++)
        if (cur.r[i] >= Deck.R_MIN - 1e-3 && cur.x[i] >= 0 && cur.x[i] <= Deck.W && cur.y[i] >= 0 && cur.y[i] <= Deck.H) n++;
      return n;
    },

    draw(ctx) {
      ctx.clearRect(0, 0, Deck.W, Deck.H);
      for (let ink = 0; ink < 2; ink++) {
        ctx.fillStyle = ink ? Deck.ACCENT : Deck.INK;
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
          if (cur.c[i] !== ink) continue;
          const x = cur.x[i], y = cur.y[i], r = cur.r[i];
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, TAU);
        }
        ctx.fill();
      }
    },
  });
})();
