// State 1 (А). Title. Beat 0: the 4096 dots sit as a 64 x 64 square of noise.
// Beat 1 (first press): the noise settles into the word «домбра» over two strings, and a pluck sounds.
(function () {
  'use strict';
  const Deck = window.Deck, { W, N } = Deck;
  const SQ = { pitch: 7, x: 1216 - 63 * 7, y: 196 }; // the square sits right, under the headline line

  Deck.state(1, {
    setup() {
      // Beat 1. Two strings run edge to edge under the word; the word takes every other dot.
      const strings = [];
      [612, 626].forEach((y, s) => {
        for (const p of Deck.pts.line(3, y, W - 3, y, 213, { r: 2.1, c: Deck.A })) strings.push(Object.assign(p, { s, t: p.u }));
      });
      const word = Deck.pts.text('домбра', { x: 64, y: 516, fit: 1152, count: N - strings.length });
      const all = Deck.pts.sortX(word.concat(strings), 6);

      // Beat 0. Dot i keeps its ink and its column of the stage: 64 dots in a row of the order
      // above become one column of the square, shuffled top to bottom, sized like noise.
      const rnd = Deck.rng(12), noise = [];
      for (let col = 0; col < 64; col++) {
        const rows = [...Array(64).keys()];
        for (let k = 63; k > 0; k--) {
          const j = Math.floor(rnd() * (k + 1));
          [rows[k], rows[j]] = [rows[j], rows[k]];
        }
        for (let k = 0; k < 64; k++)
          noise.push({ x: SQ.x + col * SQ.pitch, y: SQ.y + rows[k] * SQ.pitch, r: 0.75 + 2.55 * Math.sqrt(rnd()), c: all[col * 64 + k].c });
      }

      const idx = [[], []], t = [[], []];
      all.forEach((p, i) => { if (p.s != null) { idx[p.s].push(i); t[p.s].push(p.t); } });
      const ring = [
        Deck.wobble({ idx: idx[0], t: t[0], amp: 7, hz: 7, decay: 0.75 }),
        Deck.wobble({ idx: idx[1], t: t[1], amp: 5, hz: 9.3, decay: 0.6 }),
      ];
      return { all, noise, ring, base: noise.map((p) => p.r) };
    },

    beats: [
      {
        layout: (s) => Deck.layout(s.noise),
        caption: caption,
        // Noise is the one thing here that may keep moving: every dot breathes at its own slow rate.
        live(time, frame, s) {
          for (let i = 0; i < N; i++) frame.r[i] = Math.max(Deck.R_MIN, s.base[i] * (1 + 0.42 * Math.sin(time * (0.6 + 1.5 * Deck.hash(i, 1)) + 6.283 * Deck.hash(i, 2))));
          return true;
        },
        move: { ms: 1200, stagger: 'x', spread: 0.4 },
      },
      {
        layout: (s) => Deck.layout(s.all),
        caption: caption,
        // letters assemble left to right; the strings land last and ring once
        move: { ms: 1400, stagger: (i, fx, fy, tx) => tx, spread: 0.5, curl: 0.2 },
        enter(s, info) {
          if (info.dir > 0) Deck.sound.play(Deck.sound.strum(), { delay: 1.3 });
        },
        live(time, frame, s) {
          const a = s.ring[0](time, frame), b = s.ring[1](time, frame);
          return a || b;
        },
      },
    ],
  });

  function caption() {
    return {
      headline: 'Мультимодальные генеративные системы',
      body: 'Семинар 12 · КазНУ · 2026',
    };
  }
})();
