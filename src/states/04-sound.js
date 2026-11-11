// State 4 (А). «Звук — тоже токены». One plucked string (the open D), three pictures of the same buffer:
// beat 0 the waveform, beat 1 the spectrogram, beat 2 its columns folded into the token strip.
// The time axis never moves: left is the pluck, right is 1.2 s later, in all three beats.
(function () {
  'use strict';
  const Deck = window.Deck, { W, N } = Deck, M = Deck.MARGIN;

  // The one number of this state, fixed in spec.md ("On-screen facts, fixed"): V-06, the codec
  // frame rate from the EnCodec paper. The Gemini tokens-per-second figure (V-07) is not used
  // because two official pages disagree on it.
  const A3 = {
    value: '75',
    unit: 'кадров кодека в секунду',
    src: 'EnCodec, 2022: 24 кГц',
    v: 'V-06',
  };

  const SECONDS = 1.2;
  const WAVE = { pitch: 5, r: 1.9, axis: 338 };
  const SPEC = { cols: 128, rows: 32, pitch: 9, top: 196, rmax: 4.1 };

  Deck.state(4, {
    setup() {
      const snd = Deck.sound, buf = snd.string('D3'), to = Math.floor(SECONDS * snd.SR);

      // Beat 0: the waveform as an audio editor draws it. One column of dots per 5 px of time,
      // as many dots above and below the axis as the loudest sample there calls for.
      const cols = Math.floor((W - 2 * M) / WAVE.pitch) + 1, w = snd.wave(buf, cols, { to });
      const count = (scale) => {
        let n = 0;
        for (let c = 0; c < cols; c++) n += Math.max(1, Math.round(w.max[c] * scale)) + Math.max(1, Math.round(-w.min[c] * scale));
        return n;
      };
      let lo = 1, hi = 400;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if (count(mid) > N) hi = mid;
        else lo = mid;
      }
      const up = [], down = [];
      for (let c = 0; c < cols; c++) {
        up.push(Math.max(1, Math.round(w.max[c] * lo)));
        down.push(Math.max(1, Math.round(-w.min[c] * lo)));
      }
      // rounding leaves a few dots over: they go to the loudest columns, one each
      const loud = [...Array(cols).keys()].sort((a, b) => up[b] + down[b] - up[a] - down[a]);
      for (let k = 0, left = N - count(lo); left > 0; k++, left--) up[loud[k % cols]]++;
      const wave = [];
      for (let c = 0; c < cols; c++)
        for (let m = -up[c]; m < down[c]; m++) wave.push({ x: M + c * WAVE.pitch, y: WAVE.axis + (m + 0.5) * WAVE.pitch, r: WAVE.r, c: Deck.K });

      // Beat 1: the spectrogram, 128 moments x 32 pitches. Rows sit at multiples of half the
      // string's frequency, so every harmonic of the note lands on its own row. Loudness is dot size.
      const f0 = snd.NOTES.D3;
      const sp = snd.spectrogram(buf, { cols: SPEC.cols, rows: SPEC.rows, fmin: f0 / 2, fmax: (f0 / 2) * SPEC.rows, win: 2048, to });
      const x0 = M + (W - 2 * M - (SPEC.cols - 1) * SPEC.pitch) / 2, spec = [];
      for (let c = 0; c < SPEC.cols; c++)
        for (let row = SPEC.rows - 1; row >= 0; row--) // top (high pitch) to bottom, like the wave columns
          spec.push({ x: x0 + c * SPEC.pitch, y: SPEC.top + (SPEC.rows - 1 - row) * SPEC.pitch, r: SPEC.rmax * Math.sqrt(sp.v[c * SPEC.rows + row]), c: row === 1 ? Deck.A : Deck.K });

      // Beat 2: two neighbouring columns of the spectrogram are 64 dots: one token of the strip.
      const strip = Deck.pts.strip();
      return { buf, wave, spec, strip, fundamentalY: SPEC.top + (SPEC.rows - 2) * SPEC.pitch, specBottom: SPEC.top + (SPEC.rows - 1) * SPEC.pitch };
    },

    beats: [
      {
        layout: (s) => Deck.layout(s.wave),
        caption: () => ({
          headline: 'Звук — тоже токены',
          labels: [
            { text: 'волна', x: W - M, y: 262, align: 'right' },
            { text: 'время →', x: W - M, y: 384, align: 'right' },
          ],
          tag: 'live',
        }),
        move: { ms: 1200, stagger: 'x', spread: 0.5, curl: 0.16 },
        enter(s, info) {
          if (info.dir > 0) Deck.sound.play(s.buf, { delay: 0.7 });
        },
      },
      {
        layout: (s) => Deck.layout(s.spec),
        caption: (s) => ({
          headline: 'Звук — тоже токены',
          labels: [
            { text: 'спектрограмма', x: W - M, y: 148, align: 'right' },
            { text: 'высота ↑', x: M, y: 148 },
            { text: 'нота ре', x: M, y: s.specBottom + 18 },
            { text: 'время →', x: W - M, y: s.specBottom + 18, align: 'right' },
          ],
          tag: 'live',
        }),
        move: { ms: 1300, stagger: 'x', spread: 0.42, curl: 0.1 },
        enter(s, info) {
          if (info.dir > 0) Deck.sound.play(s.buf, { delay: 0.5 });
        },
      },
      {
        layout: (s) => Deck.layout(s.strip),
        caption: () => ({
          headline: 'Звук — тоже токены',
          figure: { value: A3.value, unit: A3.unit }, // the takeaway sits on the strip
          tag: 'schema',
          src: { text: A3.src, v: A3.v },
        }),
        // token by token, left to right: each pair of columns drops and folds into its token
        move: { ms: 1300, stagger: 'index', spread: 0.55, curl: 0.06 },
      },
    ],
  });
})();
