// The dombra: a pear-shaped body, a long thin neck, a small head with pegs, two strings.
// It is built on its own straight screen whose rows run along the instrument, so a string is
// simply one row of the screen printed in the accent ink.
(function () {
  'use strict';
  const Deck = window.Deck;
  const smooth = (t) => { t = Deck.clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  // Geometry in screen cells for a resolution of R cells along the whole instrument.
  function geometry(R, strings) {
    const g = { R, strings };
    g.B = 0.375 * R; // body length
    g.NK = 0.885 * R; // where the neck meets the head (the nut)
    g.W = 0.104 * R; // body half-width at its widest
    g.tm = 0.37; // widest point, as a share of the body length from the tail
    g.wn = strings + 0.5; // neck half-width: one ink row outside and between the strings
    g.wh = g.wn + 1.3 + strings * 0.3; // head half-width
    g.bridge = 0.2 * g.B;
    g.hole = { u: 0.6 * g.B, r: 3.3 }; // sound hole: a dark disc on the light soundboard
    g.rows = [];
    for (let k = 0; k < strings; k++) g.rows.push(2 * k - (strings - 1)); // string rows: -1, +1 for two
    // frets: nineteen ties, spaced like real frets (each a twelfth-root-of-two closer)
    g.frets = [];
    const scale = g.NK - g.bridge;
    for (let k = 1; k <= 19; k++) {
      const u = g.NK - scale * (1 - Math.pow(2, -k / 12));
      if (u > g.B + 2) g.frets.push(Math.round(u));
    }
    // pegs: one per string, alternating sides, spread along the head
    g.pegs = [];
    const per = Math.ceil(strings / 2), headLen = R - g.NK;
    for (let k = 0; k < strings; k++) {
      const side = k % 2 ? 1 : -1, n = Math.floor(k / 2);
      const q = per === 1 ? (side < 0 ? 0.36 : 0.62) : 0.22 + (0.56 * n) / (per - 1) + (side > 0 ? 0.06 : 0);
      g.pegs.push({ u: Math.round(g.NK + q * headLen), side });
    }
    return g;
  }

  // Half-width of the outline at u (cells from the tail), or -1 outside the instrument.
  function half(g, u) {
    if (u < 0 || u > g.R) return -1;
    if (u <= g.B) {
      const t = u / g.B;
      if (t <= g.tm) {
        const q = (g.tm - t) / g.tm;
        return g.W * Math.sqrt(1 - q * q); // round tail
      }
      const q = (t - g.tm) / (1 - g.tm);
      return g.wn + (g.W - g.wn) * (0.5 + 0.5 * Math.cos(Math.PI * Math.pow(q, 0.82))); // shoulder into the neck
    }
    if (u <= g.NK) return g.wn;
    const q = (u - g.NK) / (g.R - g.NK);
    const swell = g.wn + (g.wh - g.wn) * smooth(q / 0.3);
    return q > 0.78 ? swell * Math.sqrt(Math.max(0, 1 - Math.pow((q - 0.78) / 0.22, 2))) : swell;
  }

  function build(R, strings) {
    const g = geometry(R, strings), out = [];
    const vmax = Math.ceil(g.W) + 8;
    for (let u = 0; u <= Math.floor(g.R); u++) {
      const hw = half(g, u);
      const slope = (half(g, u + 0.5) - half(g, Math.max(0, u - 0.5)));
      const k = 1 / Math.sqrt(1 + slope * slope);
      for (let j = -vmax; j <= vmax; j++) {
        const d = (hw - Math.abs(j)) * k; // distance inside the outline, in cells
        const cov = Deck.clamp(d + 0.5, 0, 1);
        if (cov < 0.45) continue; // no lone dots poking out of the outline
        let part, tone, c = Deck.K, s = -1, t = 0;
        const onString = g.rows.indexOf(j);
        if (u <= g.B) {
          part = 'body';
          tone = 0.4 + 0.6 * smooth(1 - (d - 0.6) / 3.2); // dark rim, lighter soundboard
          if (Math.abs(u - g.bridge) < 0.75 && Math.abs(j) <= g.wn + 1.5) tone = 1; // bridge
        } else if (u <= g.NK) {
          part = 'neck';
          tone = Math.abs(j) > g.wn - 1 ? 0.9 : 0.5;
          if (g.frets.indexOf(u) >= 0) tone = 1;
        } else {
          part = 'head';
          tone = 0.9;
        }
        if (onString >= 0 && u >= g.bridge && u <= g.NK) {
          part = 'string';
          c = Deck.A;
          s = onString;
          t = (u - g.bridge) / (g.NK - g.bridge);
          tone = 0.92;
        } else if (part === 'body' && Math.hypot(u - g.hole.u, j) < g.hole.r) {
          tone = 1; // the sound hole
        } else if (part === 'body' && u > g.bridge && Math.abs(j) <= g.wn && hw > g.wn + 5 && tone < 1) {
          tone = 0.16; // a pale channel so the strings read over the soundboard
        }
        out.push({ u, j, cov, tone: tone * cov, c, part, s, t });
      }
    }
    // pegs: a stem and a knob
    for (const p of g.pegs) {
      const base = Math.ceil(half(g, p.u));
      for (let k = 0; k < 3; k++) out.push({ u: p.u, j: p.side * (base + k), cov: 1, tone: 0.9, c: Deck.K, part: 'peg', s: -1, t: 0 });
      for (let du = -1; du <= 1; du++)
        for (let k = 3; k < 5; k++) out.push({ u: p.u + du, j: p.side * (base + k), cov: 1, tone: 1, c: Deck.K, part: 'peg', s: -1, t: 0 });
    }
    return { g, cells: out };
  }

  // Deck.pts.dombra(opts) -> points, tail on the left, head on the right at angle 0.
  //   opts { cx = 640, cy = 360 (centre of the instrument), length = 1100 (px, tail to head tip),
  //          angle = 0 (degrees, clockwise), strings = 2, count = 4096 (exact number of points),
  //          fill = 0.43 (dot radius at full tone, as a share of the pitch) }
  // Points come tail to head and carry part ('body' | 'neck' | 'head' | 'peg' | 'string'),
  // and for string dots s (string index) and t (0 at the bridge .. 1 at the nut).
  // The result also has .pitch, .normal [nx, ny] (unit vector across the strings) and
  // .strings [{ x0, y0, x1, y1 }] (bridge end and nut end of each string).
  pts_dombra.cache = new Map();
  function pts_dombra(opts) {
    const o = Object.assign({ cx: Deck.W / 2, cy: Deck.H / 2, length: 1100, angle: 0, strings: 2, count: Deck.N, fill: 0.43 }, opts);
    const key = o.strings + ':' + o.count;
    let made = pts_dombra.cache.get(key);
    if (!made) {
      let lo = 40, hi = 600; // smallest resolution with at least `count` cells
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2;
        if (build(mid, o.strings).cells.length >= o.count) hi = mid;
        else lo = mid;
      }
      made = build(hi, o.strings);
      if (made.cells.length > o.count) {
        // drop the weakest ink dots of the outline; never a string or a peg
        const drop = made.cells.filter((c) => c.part === 'body' || c.part === 'head').sort((a, b) => a.cov - b.cov).slice(0, made.cells.length - o.count);
        const gone = new Set(drop);
        made.cells = made.cells.filter((c) => !gone.has(c));
      }
      made.cells.sort((a, b) => a.u - b.u || a.j - b.j);
      pts_dombra.cache.set(key, made);
    }
    const g = made.g, p = o.length / g.R, th = (o.angle * Math.PI) / 180, cs = Math.cos(th), sn = Math.sin(th);
    const at = (u, j) => {
      const a = (u - g.R / 2) * p, b = j * p;
      return [o.cx + a * cs - b * sn, o.cy + a * sn + b * cs];
    };
    const rmax = p * o.fill;
    const out = made.cells.map((c) => {
      const [x, y] = at(c.u, c.j);
      return { x, y, r: Math.max(Deck.R_MIN, rmax * Math.sqrt(c.tone)), c: c.c, part: c.part, s: c.s, t: c.t };
    });
    out.pitch = p;
    out.normal = [-sn, cs];
    out.strings = g.rows.map((j) => {
      const a = at(g.bridge, j), b = at(g.NK, j);
      return { x0: a[0], y0: a[1], x1: b[0], y1: b[1] };
    });
    return out;
  }
  Deck.pts.dombra = pts_dombra;

  // Deck.dombra.draw(ctx, opts) fills the silhouette (no strings) into a canvas context, for
  // Deck.pts.mask when a state wants the dombra on another screen. Same opts as Deck.pts.dombra.
  Deck.dombra = {
    draw(ctx, opts) {
      const o = Object.assign({ cx: Deck.W / 2, cy: Deck.H / 2, length: 1100, angle: 0, strings: 2 }, opts);
      const g = geometry(232, o.strings), p = o.length / g.R;
      ctx.save();
      ctx.translate(o.cx, o.cy);
      ctx.rotate((o.angle * Math.PI) / 180);
      ctx.beginPath();
      const top = [], bottom = [];
      for (let u = 0; u <= g.R; u += 0.5) {
        const hw = half(g, u) * p, x = (u - g.R / 2) * p;
        top.push([x, -hw]);
        bottom.unshift([x, hw]);
      }
      top.concat(bottom).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
      for (const peg of g.pegs) {
        const base = half(g, peg.u) * p, x = (peg.u - g.R / 2) * p;
        ctx.fillRect(x - p / 2, peg.side > 0 ? base : -base - 3 * p, p, 3 * p);
        ctx.fillRect(x - 1.5 * p, peg.side > 0 ? base + 3 * p : -base - 5 * p, 3 * p, 2 * p);
      }
      ctx.restore();
    },
  };

  // Deck.wobble(spec) -> a live(t, frame) function that makes string dots vibrate and die away.
  //   spec { idx (dot indices), t (matching positions 0..1 along the string), normal [nx, ny],
  //          amp = 5 (px), hz = 11, decay = 0.9 (s), mode = 1 }
  // The motion is a slowed picture of the string, not its real frequency. Returns false when it
  // has died away, so the scene settles completely.
  Deck.wobble = function (spec) {
    const o = Object.assign({ amp: 5, hz: 11, decay: 0.9, mode: 1, normal: [0, 1] }, spec);
    return function (t, frame) {
      const env = Math.exp(-t / o.decay);
      if (env < 0.02) return false;
      const a = o.amp * env * Math.cos(2 * Math.PI * o.hz * t);
      for (let k = 0; k < o.idx.length; k++) {
        const i = o.idx[k], d = a * Math.sin(Math.PI * o.mode * o.t[k]);
        frame.x[i] += o.normal[0] * d;
        frame.y[i] += o.normal[1] * d;
      }
      return true;
    };
  };
})();
