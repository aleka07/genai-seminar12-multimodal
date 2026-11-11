// State 5 (А). «Видео — патчи во времени». Beat 0: the dombra with its D string ringing (the motion
// is the content; the pluck sounds). Beat 1: the same picture peels into four frames receding in
// depth, each frame a later moment of the string, bowed less each time. Beat 2: the frames are
// cut into patches and the patches drop into the token strip, the front frame first.
(function () {
  'use strict';
  const Deck = window.Deck, { W, N } = Deck, M = Deck.MARGIN;

  // The one number of this state, fixed in spec.md ("On-screen facts, fixed"): V-10, Gemini samples
  // video at 1 frame per second in its default processing.
  const A4 = {
    value: '1',
    unit: 'кадр в секунду берёт Gemini',
    src: 'Gemini API docs, 2026',
    v: 'V-10',
  };

  const BIG = { cx: 640, cy: 382, length: 1150 };
  // The stack, in a small perspective scene: camera distance F; frame k sits dX right, dY up and dZ
  // deeper than frame k-1. Frames are parallel to the screen, so depth shows as size. Four frames,
  // offset so that no neck crosses a body: every body outline and every string stays whole.
  const STACK = { frames: 4, F: 1500, x: 450, y: 500, length: 690, dX: 185, dY: 104, dZ: 160, gap: 1.3 };
  // The D string in each frame, in px across the strings: a damped ringing caught at four moments,
  // bowed less each time. The bow points away from the other string, so the arc never crosses it
  // and rises out of the neck into paper where the room can see it.
  const BOW = [-25, -17, -11, -6];
  const layer = new Uint8Array(N); // frame of each dot in beat 1, for the peel order

  // Frame points for a dombra sampled with `count` dots: every frame is that one picture, placed in
  // depth, with its D string bowed; dots hidden behind a nearer frame are dropped.
  function frames(count) {
    const one = Deck.pts.dombra({ cx: 0, cy: 0, length: STACK.length, count, fill: 0.4 });
    const out = [];
    for (let k = 0; k < STACK.frames; k++) {
      const f = STACK.F / (STACK.F + k * STACK.dZ);
      const cx = 640 + (STACK.x + k * STACK.dX - 640) * f, cy = 360 + (STACK.y - k * STACK.dY - 360) * f;
      out.push(one.map((p, q) => {
        let y = p.y;
        if (p.part === 'string' && p.s === 0) y += BOW[k] * Math.sin(Math.PI * p.t);
        return { x: cx + p.x * f, y: cy + y * f, r: Math.max(Deck.R_MIN, p.r * f), c: p.c, k, rank: q / one.length, pitch: one.pitch * f };
      }));
    }
    // occlusion: a dot is hidden when a dot of a nearer frame lies within `gap` of that frame's
    // pitch, which leaves a thin paper margin around every nearer frame, as with cut-out prints
    const vis = [];
    for (let k = 0; k < out.length; k++) {
      const front = out.slice(0, k);
      const hash = new Map(), cell = 12;
      for (const fr of front)
        for (const p of fr) {
          const key = Math.floor(p.x / cell) + ',' + Math.floor(p.y / cell);
          if (!hash.has(key)) hash.set(key, []);
          hash.get(key).push(p);
        }
      vis.push(out[k].filter((p) => {
        const gx = Math.floor(p.x / cell), gy = Math.floor(p.y / cell);
        for (let a = -1; a <= 1; a++)
          for (let b = -1; b <= 1; b++) {
            const list = hash.get(gx + a + ',' + (gy + b));
            if (list) for (const q of list) if (Math.hypot(q.x - p.x, q.y - p.y) < STACK.gap * q.pitch) return false;
          }
        return true;
      }));
    }
    return vis;
  }

  Deck.state(5, {
    setup() {
      const dombra = Deck.pts.dombra({ cx: BIG.cx, cy: BIG.cy, length: BIG.length });
      const idx = [], t = [];
      dombra.forEach((p, i) => { if (p.part === 'string' && p.s === 0) { idx.push(i); t.push(p.t); } });
      const ring = Deck.wobble({ idx, t, normal: dombra.normal, amp: 12, hz: 7, decay: 0.85 });

      // Beat 1. The smallest sample count whose visible dots reach 4096; the surplus goes from the
      // back of the stack, faintest dots first.
      let lo = 300, hi = 4096, vis;
      while (hi - lo > 4) {
        const mid = Math.floor((lo + hi) / 2), v = frames(mid);
        if (v.reduce((n, f) => n + f.length, 0) >= N) hi = mid;
        else lo = mid;
      }
      vis = frames(hi);
      let extra = vis.reduce((n, f) => n + f.length, 0) - N;
      for (let k = vis.length - 1; extra > 0 && k >= 0; k--) {
        const drop = new Set(vis[k].slice().sort((a, b) => a.r - b.r).slice(0, extra));
        extra -= drop.size;
        vis[k] = vis[k].filter((p) => !drop.has(p));
      }
      // Every frame is the same picture, so a dot that sits at share q along the big dombra's order
      // (tail to head) goes to the frame dot at the same share: each frame lifts off the whole
      // instrument at once, and the dots move as bodies.
      const all = [].concat(...vis).sort((a, b) => a.rank - b.rank || a.k - b.k);
      const stackL = all; // dot i (big dombra order) -> all[i]
      for (let i = 0; i < N; i++) layer[i] = all[i].k;

      // Beat 2. Frames front to back, each read left to right in slabs of 64 dots: one slab is one
      // token. Inside a slab, columns of 16 left to right meet the token's 4 columns.
      const strip = Deck.pts.strip(), stripL = new Array(N), seq = [];
      for (let k = 0; k < STACK.frames; k++) {
        const own = [];
        stackL.forEach((p, i) => { if (p.k === k) own.push(i); });
        own.sort((a, b) => stackL[a].x - stackL[b].x);
        seq.push(...own);
      }
      for (let tok = 0; tok < 64; tok++) {
        const slab = seq.slice(tok * 64, tok * 64 + 64).sort((a, b) => stackL[a].x - stackL[b].x);
        for (let col = 0; col < 4; col++) {
          const column = slab.slice(col * 16, col * 16 + 16).sort((a, b) => stackL[a].y - stackL[b].y);
          for (let row = 0; row < 16; row++) stripL[column[row]] = strip[tok * 64 + col * 16 + row];
        }
      }

      const b0 = Deck.pts.bounds(vis[0]), bN = Deck.pts.bounds(vis[vis.length - 1]);
      return { dombra, ring, stackL, stripL, b0, bN };
    },

    beats: [
      {
        layout: (s) => Deck.layout(s.dombra),
        caption: { headline: 'Видео — патчи во времени', tag: 'schema' },
        move: { ms: 1300, stagger: 'x', spread: 0.5, curl: 0.12 },
        enter(s, info) {
          if (info.dir > 0) Deck.sound.play(Deck.sound.string('D3'), { delay: 1.15 });
        },
        live: (t, frame, s) => s.ring(t, frame),
        stillAt: 1 / 7, // a full swing: the still frame shows the string bowed
      },
      {
        layout: (s) => Deck.layout(s.stackL),
        caption: (s) => ({
          headline: 'Видео — патчи во времени',
          labels: [
            { text: 'кадр', x: s.b0.x0, y: s.b0.y1 + 16 },
            { text: 'время →', x: W - M, y: s.bN.y1 + 40, align: 'right' },
          ],
          tag: 'schema',
        }),
        // the frames peel off the picture one after another, the back frame first
        move: { ms: 1400, stagger: (i) => -layer[i], spread: 0.55, curl: 0.06 },
      },
      {
        layout: (s) => Deck.layout(s.stripL),
        caption: {
          headline: 'Видео — патчи во времени',
          figure: { value: A4.value, unit: A4.unit },
          tag: 'schema',
          src: { text: A4.src, v: A4.v },
        },
        // token by token: the front frame falls into the strip first, the back frame last
        move: { ms: 1350, stagger: (i, fx, fy, tx) => tx, spread: 0.6, curl: 0.06 },
      },
    ],
  });
})();
