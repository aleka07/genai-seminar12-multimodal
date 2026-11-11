// State 2 (А). «Слово — это токены».
// Beat 0: the word «домбра» alone; the two strings of state 1 lift away into the reserve rule.
// Beat 1: the word splits into its real tokens, «дом» and «бра», ids in mono under them (V-TOK-1).
// Beat 2: the token strip. The word is 2 tokens, the strip holds 64: the two tokens are the two
//         full tiles at its start, the other 62 are pin-dot tiles, the quiet rest of a sentence.
(function () {
  'use strict';
  const Deck = window.Deck, { W, N } = Deck;

  // The one number of this state, fixed in spec.md ("On-screen facts, fixed"): V-TOK-1 in
  // facts-tokenizer.md, computed with tiktoken 0.14.0, encoding o200k_base.
  const A1 = {
    value: '2',
    unit: 'токена: «дом» и «бра»',
    tokens: [{ text: 'дом', id: '134576' }, { text: 'бра', id: '69513' }],
    src: 'посчитано: tiktoken, o200k_base',
    v: 'V-TOK-1',
  };

  const HEADLINE = 'Слово — это токены';
  const WORD = { x: 64, y: 516, fit: 1152 }; // exactly the word of state 1 beat 1
  const GAP = 104; // the cut between the two tokens, px

  Deck.state(2, {
    setup() {
      // Rebuild state 1's last picture point for point, so that dot i is where state 1 left it.
      const strings = [];
      [612, 626].forEach((y, s) => {
        for (const p of Deck.pts.line(3, y, W - 3, y, 213, { r: 2.1, c: Deck.A })) strings.push(Object.assign(p, { s }));
      });
      const word = Deck.pts.text('домбра', Object.assign({ count: N - strings.length }, WORD));
      const prev = Deck.pts.sortX(word.concat(strings), 6);

      // Beat 0: word dots stay exactly in place; each string dot rises straight up into a two-row
      // rule along the top edge (the reserve, spread to the full width), so it can drop straight
      // down to its place in the strip later.
      const parkAt = []; // indices of the parked dots
      const b0 = prev.map((p, i) => {
        if (p.s == null) return { x: p.x, y: p.y, r: p.r, c: Deck.K };
        parkAt.push(i);
        return { x: Deck.MARGIN + ((p.x - 3) * (W - 2 * Deck.MARGIN)) / (W - 6), y: 20 + 3 * p.s, r: 0.9, c: Deck.K };
      });

      // Beat 1: the same size of letter for both tokens, one gap between them, filling 64 .. 1216.
      const nWord = N - strings.length;
      const size = Deck.pts.text('домбра', { x: WORD.x, y: WORD.y, fit: WORD.fit - GAP }).size;
      const probeA = Deck.pts.text('дом', { x: WORD.x, y: WORD.y, size }).length;
      const probeB = Deck.pts.text('бра', { x: W - WORD.x, y: WORD.y, size, align: 'right' }).length;
      const nA = Math.round((nWord * probeA) / (probeA + probeB));
      const tokA = Deck.pts.text('дом', { x: WORD.x, y: WORD.y, size, count: nA });
      const tokB = Deck.pts.text('бра', { x: W - WORD.x, y: WORD.y, size, count: nWord - nA, align: 'right' });
      const split = tokA.concat(tokB); // both sorted by x already, and A lies left of B
      const b1 = [];
      const parked = new Set(parkAt);
      for (let i = 0, j = 0; i < N; i++) b1.push(parked.has(i) ? b0[i] : split[j++]);

      // Beat 2: the strip, token by token (index order = left to right, as every state expects).
      const strip = Deck.pts.strip().map((p) => (p.tok < 2 ? p : Object.assign(p, { r: Deck.R_MIN })));

      // ids sit under the descenders, centred under each token
      const bA = Deck.pts.bounds(tokA), bB = Deck.pts.bounds(tokB), descent = Math.max(bA.y1, bB.y1);
      const ids = [bA, bB].map((b, n) => ({ text: A1.tokens[n].id, x: b.cx, y: descent + 20, align: 'center', mono: true }));
      return { b0, b1, strip, ids };
    },

    beats: [
      {
        layout: (s) => Deck.layout(s.b0),
        caption: { headline: HEADLINE },
        // the strings rise into the rule from the left; the word does not move
        move: { ms: 1100, stagger: 'x', spread: 0.4, curl: 0.1 },
      },
      {
        layout: (s) => Deck.layout(s.b1),
        caption: (s) => ({
          headline: HEADLINE,
          labels: s.ids,
          src: { text: A1.src, v: A1.v },
        }),
        // the cut opens from the middle outwards: both halves step aside together
        move: { ms: 1000, stagger: 'radial', origin: [640, 440], spread: 0.3, curl: 0.04 },
      },
      {
        layout: (s) => Deck.layout(s.strip),
        caption: {
          headline: HEADLINE,
          figure: { value: A1.value, unit: A1.unit },
          tag: 'schema',
          src: { text: A1.src, v: A1.v },
        },
        // token by token, left to right, as in state 4
        move: { ms: 1300, stagger: 'index', spread: 0.55, curl: 0.06 },
      },
    ],
  });
})();
