// State 13 (Б). «Три вопроса перед выбором». No numbers: the questions are the content.
// The real dombra (two strings again) lies across the stage, first only as a pin-dot proof.
// Each press asks one more question, and the instrument is printed up to that question's gate:
// a front of full-tone dots sweeps left to right, so the dombra passes the three gates in turn.
// After the third it stands fully printed, ready to become the word again in state 14.
(function () {
  'use strict';
  const Deck = window.Deck, M = Deck.MARGIN;

  const DOMBRA = { cx: 640, cy: 460, length: 1120 };
  const COL = 384; // three stations across the stage: x 64, 448, 832
  const Q = [
    'Что на входе\nи на выходе?',
    'Нужен ответ\nза доли секунды?',
    'Сколько стоит\nошибка?',
  ];
  const Q_Y = 164, Q_SIZE = 40;
  const GATE = [M + COL - 30, M + 2 * COL - 30, Deck.W + 60]; // printed to the left of the gate
  const RAMP = 44; // the gate is soft: dots shrink across 44 px, like a halftone edge

  Deck.state(13, {
    setup() {
      const base = Deck.pts.dombra(DOMBRA);
      // a beat's picture: full tone left of the gate, a pale proof (pin dots) right of it
      const printed = (gate) =>
        base.map((p) => {
          const f = Deck.clamp((gate - p.x) / RAMP + 0.5, 0, 1), k = f * f * (3 - 2 * f);
          const pale = Math.max(Deck.R_MIN, 0.5 * p.r);
          return Object.assign({}, p, { r: pale + (p.r - pale) * k });
        });
      return { beats: GATE.map(printed) };
    },

    beats: [0, 1, 2].map((k) => ({
      layout: (s) => Deck.layout(s.beats[k]),
      caption: () => ({
        headline: 'Три вопроса перед выбором',
        labels: Q.slice(0, k + 1).map((text, i) => ({ text, x: M + i * COL, y: Q_Y, size: Q_SIZE, upright: true })),
        tag: 'schema',
      }),
      // the front of ink runs along x; from state 12 the six strings close up into two on the way
      move: k === 0 ? { ms: 1300, stagger: 'x', spread: 0.45, curl: 0.1 } : { ms: 1100, stagger: 'x', spread: 0.7, curl: 0 },
    })),
  });
})();
