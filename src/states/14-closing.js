// State 14 (Б). Closing. The dots return to the huge word «домбра» over two strings, exactly the
// composition of state 1 beat 1, so the deck ends where it opened; the thesis replaces the title,
// «Вопросы?» replaces the speakers, and the strings ring once more with the same strum.
(function () {
  'use strict';
  const Deck = window.Deck, { W, N } = Deck;

  Deck.state(14, {
    setup() {
      // Same construction as 01-title.js: two strings edge to edge, the word takes every other dot.
      const strings = [];
      [612, 626].forEach((y, s) => {
        for (const p of Deck.pts.line(3, y, W - 3, y, 213, { r: 2.1, c: Deck.A })) strings.push(Object.assign(p, { s, t: p.u }));
      });
      const word = Deck.pts.text('домбра', { x: 64, y: 516, fit: 1152, count: N - strings.length });
      const all = Deck.pts.sortX(word.concat(strings), 6);
      const idx = [[], []], t = [[], []];
      all.forEach((p, i) => { if (p.s != null) { idx[p.s].push(i); t[p.s].push(p.t); } });
      const ring = [
        Deck.wobble({ idx: idx[0], t: t[0], amp: 7, hz: 7, decay: 0.75 }),
        Deck.wobble({ idx: idx[1], t: t[1], amp: 5, hz: 9.3, decay: 0.6 }),
      ];
      return { all, ring };
    },

    beats: [
      {
        layout: (s) => Deck.layout(s.all),
        caption: () => ({
          headline: { text: 'Разные модальности —\nодно пространство токенов', w: 980 },
          body: 'Вопросы?',
        }),
        // the dombra folds back into its name left to right; the strings land last and ring
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
})();
