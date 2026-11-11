// State 12 (Б). «Уверенно. Неверно.» Beat 0: the dots assemble a dombra with six strings, printed as
// cleanly as the real one, and nothing on screen says it is wrong: the room should count the strings
// before the speaker says «галлюцинация». Beat 1: the same dombra steps up to make room for the
// three places where it breaks and the one number (deepfake detectors in the wild).
// The six-string dombra is our own illustration of a hallucination, not a model output: tag 'schema'.
(function () {
  'use strict';
  const Deck = window.Deck, M = Deck.MARGIN;

  // The one number of this state, fixed in spec.md ("On-screen facts, fixed"): V-23,
  // Deepfake-Eval-2024: open-source video detectors lose 50 % of their AUC on 2024 in-the-wild
  // deepfakes compared with earlier benchmarks. It measures detectors, not people.
  const E = {
    value: '−50 %',
    unit: 'AUC открытых детекторов видео',
    src: 'Deepfake-Eval-2024: видео из сети против прежних тестов',
    v: 'V-23',
  };

  // beat 0: the same place and size as the dombra the deck has been playing, so only the strings change
  const WHOLE = { cx: 640, cy: 390, length: 1120, strings: 6 };
  // beat 1: up and slightly smaller, so the figure gets the lower band
  const UP = { cx: 640, cy: 288, length: 1080, strings: 6 };

  Deck.state(12, {
    setup() {
      return { whole: Deck.pts.dombra(WHOLE), up: Deck.pts.dombra(UP) };
    },

    beats: [
      {
        layout: (s) => Deck.layout(s.whole),
        caption: () => ({ headline: 'Уверенно. Неверно.', tag: 'schema' }),
        // tail first, head last: the instrument is laid down in one confident stroke
        move: { ms: 1400, stagger: 'x', spread: 0.5, curl: 0.12 },
      },
      {
        layout: (s) => Deck.layout(s.up),
        caption: () => ({
          headline: 'Уверенно. Неверно.',
          body: 'Другие границы: дипфейки, цена, оценка.',
          figure: { value: E.value, unit: E.unit, y: 604 },
          tag: 'schema',
          src: { text: E.src, v: E.v },
        }),
        move: { ms: 1000, stagger: 'x', spread: 0.3, curl: 0.04 },
      },
    ],
  });
})();
