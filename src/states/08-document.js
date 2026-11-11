// State 8 (Б). «Понять документ». The dots form one sheet of a document: a drawing of the dombra
// with a small table beside it, on a sheet printed as a pale dot screen (the paper of the page).
// Beat 0: the sheet, and what one such page costs a model (258 tokens, V-17).
// Beat 1: the question «Сколько струн?» gets its answer, and the two strings of the drawing take
// the accent ink: the answer points into the picture.
(function () {
  'use strict';
  const Deck = window.Deck, { N } = Deck, M = Deck.MARGIN;

  // The one number of this state, fixed in spec.md ("On-screen facts, fixed"): V-17,
  // "Each document page is equivalent to 258 tokens" (Gemini API docs, document processing).
  const D9 = { value: '258', unit: 'токенов на страницу PDF', src: 'Gemini API docs, 2026', v: 'V-17' };

  // The sheet spans the stage; the figure (beat 0) and the dialogue (beat 1) share the band under it.
  const SHEET = { x0: M, x1: Deck.W - M, y0: 140, y1: 446, pitch: 15, r: 0.9 };
  const DOMBRA = { cx: 488, cy: 293, length: 768 };
  const TABLE = { x: 930, y: 214, rowH: 26, rows: 7, colB: 1116, pitch: 3.6, r: 1.25 };

  Deck.state(8, {
    setup() {
      // The table: rows of greeked text, each a bar three dots high. Row 0 is the header, set heavier.
      // Lengths are seeded, so the table is the same in every render.
      const rnd = Deck.rng(808), table = [];
      const bar = (x, y, len, r) => {
        const cols = Math.max(2, Math.round(len / TABLE.pitch));
        for (let col = 0; col < cols; col++)
          for (let row = 0; row < 3; row++) table.push({ x: x + col * TABLE.pitch, y: y + row * TABLE.pitch, r, c: Deck.K });
      };
      for (let k = 0; k < TABLE.rows; k++) {
        const y = TABLE.y + k * TABLE.rowH, r = k === 0 ? 1.7 : TABLE.r;
        bar(TABLE.x, y, k === 0 ? 120 : 70 + 80 * rnd(), r);
        bar(TABLE.colB, y, k === 0 ? 62 : 22 + 40 * rnd(), r);
      }

      // The paper of the sheet: a pale straight screen, knocked out around the drawing and the table
      // so the content sits on clean paper, the way a halftone page keeps its line art crisp.
      const probe = Deck.pts.dombra(Object.assign({ count: 2400 }, DOMBRA));
      const busy = new Set(), cell = 8, key = (x, y) => Math.floor(x / cell) + ',' + Math.floor(y / cell);
      for (const p of probe.concat(table)) busy.add(key(p.x, p.y));
      const near = (x, y) => {
        for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (busy.has(key(x + dx * cell, y + dy * cell))) return true;
        return false;
      };
      const paper = [];
      const cols = Math.floor((SHEET.x1 - SHEET.x0) / SHEET.pitch), rows = Math.floor((SHEET.y1 - SHEET.y0) / SHEET.pitch);
      const ox = SHEET.x0 + (SHEET.x1 - SHEET.x0 - cols * SHEET.pitch) / 2, oy = SHEET.y0 + (SHEET.y1 - SHEET.y0 - rows * SHEET.pitch) / 2;
      for (let i = 0; i <= cols; i++)
        for (let j = 0; j <= rows; j++) {
          const x = ox + i * SHEET.pitch, y = oy + j * SHEET.pitch;
          if (!near(x, y)) paper.push({ x, y, r: SHEET.r, c: Deck.K });
        }

      // The drawing takes every dot that is left, so nothing parks in the reserve.
      const dombra = Deck.pts.dombra(Object.assign({ count: N - paper.length - table.length }, DOMBRA));
      const page = (strings, r) =>
        Deck.pts.sortX(
          dombra
            .map((p) => (p.part === 'string' ? Object.assign({}, p, { c: strings, r: p.r * r }) : Object.assign({}, p, { c: Deck.K })))
            .concat(paper, table),
          6
        );
      return {
        plain: page(Deck.K, 1), // beat 0: the whole sheet in one ink
        answer: page(Deck.A, 1.3), // beat 1: the same dots; the strings answer
      };
    },

    beats: [
      {
        layout: (s) => Deck.layout(s.plain),
        caption: {
          headline: 'Понять документ',
          figure: { value: D9.value, unit: D9.unit, y: 612 },
          tag: 'schema',
          src: { text: D9.src, v: D9.v },
        },
        move: { ms: 1300, stagger: 'x', spread: 0.5, curl: 0.12 },
      },
      {
        layout: (s) => Deck.layout(s.answer),
        caption: {
          headline: 'Понять документ',
          labels: [
            { text: '— Сколько струн?', x: M, y: 482, size: 34, upright: true },
            { text: '— Две.', x: M, y: 532, size: 34 },
          ],
          tag: 'schema',
        },
        // the strings change ink in place; the move sweeps from the dialogue side into the drawing
        move: { ms: 1000, stagger: 'x', spread: 0.6, curl: 0 },
      },
    ],
  });
})();
