// Core: the Deck namespace, constants, query flags, seeded random, easing.
// Every other engine file and every state module hangs off window.Deck.
(function () {
  'use strict';
  const q = new URLSearchParams(location.search);

  const Deck = (window.Deck = {
    W: 1280, // stage width in logical units
    H: 720, // stage height
    N: 4096, // dots, always
    TOTAL: 14, // states

    // Query flags (contract): ?still=1 settled and seeded, ?mute=1 silent.
    still: q.get('still') === '1',
    muted: q.get('mute') === '1',
    demo: q.get('demo') || '', // engine demos for builders: ?demo=dombra|dombra6|strip|reserve

    // The two display names live here and nowhere else. А owns states 1-7, Б owns 8-14.
    SPEAKERS: { А: 'Докладчик А', Б: 'Докладчик Б' },

    // Palette (DESIGN.md). Two inks on paper; there is no grey and no opacity.
    PAPER: '#F1F0EC',
    INK: '#17161B',
    ACCENT: '#E4007C',

    // Ink ids for dots.
    K: 0, // ink
    A: 1, // accent

    // Dot radii in stage units (DESIGN.md, "Dot spec").
    R_MIN: 0.7, // smallest dot ever drawn; nothing is hidden
    R_FORM: 2.3, // a dot at full tone on the 6 px form screen

    // Caption geometry.
    MARGIN: 64,
    FONT_TEXT: 'Literata',
    FONT_DOTS: 'Literata', // face the glyph sampler draws with
    FONT_MONO: 'PT Mono',
  });

  Deck.speakerOf = function (n) {
    const letter = n <= 7 ? 'А' : 'Б';
    return { letter, name: Deck.SPEAKERS[letter] };
  };

  // Seeded random (mulberry32). Deck.rng(seed)() gives floats in [0, 1).
  Deck.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Stable per-index hash in [0, 1): the same dot always gets the same value.
  Deck.hash = function (i, salt) {
    let h = Math.imul((i + 1) ^ ((salt || 0) * 0x9e3779b1), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  Deck.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  Deck.lerp = (a, b, t) => a + (b - a) * t;

  Deck.ease = {
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    linear: (t) => t,
  };
})();
