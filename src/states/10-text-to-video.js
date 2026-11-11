// State 10 (Б). «Снять по тексту». Beat 0: a short prompt set in dots. Beat 1: it becomes a clip:
// a row of video frames with the sound wave under it on one time axis. Frames and wave read the same
// pluck buffer: before the pluck the string is still and the wave is silent; the frame in which the
// string is pulled sits exactly over the peak of the wave; later frames ring as loud as the wave is.
(function () {
  'use strict';
  const Deck = window.Deck, { W, N } = Deck, M = Deck.MARGIN;

  // The one number of this state, fixed in spec.md ("On-screen facts, fixed"): V-19, the clip length
  // with native audio of Gemini Omni 1.2 Flash. No release date: it is UNVERIFIED in facts.md.
  const D11 = {
    value: '15',
    unit: 'секунд видео со звуком',
    src: 'Gemini API docs, 2026: Gemini Omni 1.2 Flash',
    v: 'V-19',
  };

  const PROMPT = ['домбра звучит', 'в степи'];
  const FR = { n: 5, cols: 27, rows: 15, pitch: 8, top: 146, pluck: 1 }; // frame k = pluck is the pulled one
  const WAVE = { pitch: 5, dy: 4, r: 1.75, axis: 376 };
  // the clip on screen: 5 frames a third of a second apart. 1.6 s puts one period of D3 in each
  // wave column, so the wave's outline stays smooth (1.0 s aliases it into a comb).
  const SECONDS = 1.6;

  Deck.state(10, {
    setup() {
      const snd = Deck.sound, SR = snd.SR;

      // ---- the time axis: x = M + time * (W - 2M) / SECONDS, shared by frames and wave ----------
      const fw = (FR.cols - 1) * FR.pitch;
      const gap = (W - 2 * M - FR.n * fw) / (FR.n - 1);
      const frameCx = (k) => M + k * (fw + gap) + fw / 2;
      const cols = Math.floor((W - 2 * M) / WAVE.pitch) + 1;
      const colT = SECONDS / cols; // seconds per wave column
      // The pluck lands where its loudest sample falls in the column under the pulled frame's centre.
      const one = snd.pluck('D3', { dur: SECONDS });
      let peak = 0;
      for (let k = 1; k < one.length; k++) if (Math.abs(one[k]) > Math.abs(one[peak])) peak = k;
      const peakCol = Math.round((frameCx(FR.pluck) - M) / WAVE.pitch);
      const tPluck = (peakCol + 0.5) * colT - peak / SR;
      const buf = snd.mix([{ t: tPluck, f: 'D3' }], SECONDS);
      // wave columns shift by under half a column so the peak column sits exactly under the frame centre
      const waveX0 = frameCx(FR.pluck) - peakCol * WAVE.pitch;
      const w = snd.wave(buf, cols, { to: Math.floor(SECONDS * SR) });
      let loudest = 0;
      for (let c = 0; c < cols; c++) if (w.max[c] - w.min[c] > w.max[loudest] - w.min[loudest]) loudest = c;
      if (loudest !== peakCol) console.warn('state 10: wave peak column', loudest, 'is not under the plucked frame', peakCol);

      // ---- frames: a close-up of the dombra where the body meets the neck, two strings across ------
      // How far the plucked string swings in frame k: the loudness of the same buffer at that moment.
      const env = (t0, t1) => {
        let m = 0;
        for (let k = Math.max(0, Math.floor(t0 * SR)); k < Math.min(buf.length, Math.floor(t1 * SR)); k++) m = Math.max(m, Math.abs(buf[k]));
        return m;
      };
      const frameT = (k) => (frameCx(k) - waveX0) / WAVE.pitch * colT + colT / 2;
      const peakEnv = env(frameT(FR.pluck) - 0.05, frameT(FR.pluck) + 0.05);
      const frames = [];
      const mid = (FR.rows - 1) / 2, cc = (FR.cols - 1) / 2, rmax = FR.pitch * 0.43, A = 3.2 * FR.pitch;
      // The picture in every frame: the whole pear of the body with its sound hole, and the neck with
      // its frets running out to the right. Tone 0..1 at column c, row j (0 = the neck's axis).
      const half = (c) => {
        if (c < -0.6) return -1;
        if (c <= 5.5) return 6.9 * Math.sqrt(Math.max(0, 1 - Math.pow((5.5 - c) / 5.9, 2))); // round tail
        if (c <= 14) return 2.1 + 4.8 * (0.5 + 0.5 * Math.cos((Math.PI * (c - 5.5)) / 8.5)); // shoulder
        return 2.1; // neck
      };
      const closeUp = (c, j) => {
        const d = half(c) - Math.abs(j); // rows inside the outline
        if (c > 14 && (c - 17) % 3 === 0 && Math.abs(j) <= 3) return 1; // frets, tied round the neck
        if (d < 0) return 0; // paper: a pin dot
        if (Math.hypot(c - 5.5, j) < 2.1 || (c === 1 && Math.abs(j) <= 2)) return 1; // sound hole, bridge
        if (c > 14 && (c === 17 || c === 20 || c === 23 || c === 26)) return 1; // frets
        return d < 0.9 ? 0.95 : c > 14 ? 0.25 : 0.4; // dark rim, neck, soundboard
      };
      for (let k = 0; k < FR.n; k++) {
        const x0 = frameCx(k) - fw / 2;
        const a = k < FR.pluck ? 0 : Deck.clamp(env(frameT(k) - 0.05, frameT(k) + 0.05) / peakEnv, 0, 1);
        const swing = (c) => {
          if (k < FR.pluck) return 0;
          if (k === FR.pluck) return -A * (1 - Math.abs(c - cc) / (cc + 1)); // pulled into a triangle
          const sign = (k - FR.pluck) % 2 ? 1 : -1; // later frames catch it on alternate sides
          return sign * A * a * Math.sin((Math.PI * (c + 1)) / (FR.cols + 1));
        };
        for (let c = 0; c < FR.cols; c++) {
          for (let row = 0; row < FR.rows; row++) {
            const j = row - mid, x = x0 + c * FR.pitch, y = FR.top + row * FR.pitch;
            if ((j === -1 || j === 1) && c >= 2) { // the strings run from the bridge (column 1) out
              frames.push({ x, y: y + (j === -1 ? swing(c) : 0), r: 0.92 * rmax * 0.9, c: Deck.A, f: k });
              continue;
            }
            frames.push({ x, y, r: Math.max(Deck.R_MIN, rmax * Math.sqrt(closeUp(c, j))), c: Deck.K, f: k });
          }
        }
      }

      // ---- the wave: dots stacked to the sample extremes, the way state 4 draws it ---------------
      const budget = N - frames.length;
      const count = (scale) => {
        let n = 0;
        for (let c = 0; c < cols; c++) n += Math.max(1, Math.round(w.max[c] * scale)) + Math.max(1, Math.round(-w.min[c] * scale));
        return n;
      };
      let lo = 1, hi = 400;
      for (let k = 0; k < 40; k++) {
        const m = (lo + hi) / 2;
        if (count(m) > budget) hi = m;
        else lo = m;
      }
      const up = [], down = [];
      for (let c = 0; c < cols; c++) {
        up.push(Math.max(1, Math.round(w.max[c] * lo)));
        down.push(Math.max(1, Math.round(-w.min[c] * lo)));
      }
      const order = [...Array(cols).keys()].sort((a, b) => up[b] + down[b] - up[a] - down[a]);
      for (let k = 0, left = budget - count(lo); left > 0; k++, left--) (k % 2 ? down : up)[order[Math.floor(k / 2) % cols]]++;
      const wave = [];
      for (let c = 0; c < cols; c++)
        for (let m = -up[c]; m < down[c]; m++) wave.push({ x: waveX0 + c * WAVE.pitch, y: WAVE.axis + (m + 0.5) * WAVE.dy, r: WAVE.r, c: Deck.K });
      const clip = Deck.pts.sortX(frames.concat(wave), 6);
      const waveTop = WAVE.axis - Math.max(...up) * WAVE.dy;

      // ---- the prompt: two lines of Literata Black and a text caret, on one halftone screen -------
      const probe = document.createElement('canvas').getContext('2d');
      const font = (size) => `900 ${size}px "${Deck.FONT_DOTS}"`;
      probe.font = font(200);
      const m0 = probe.measureText(PROMPT[0]);
      const size = (200 * 1100) / (m0.actualBoundingBoxLeft + m0.actualBoundingBoxRight);
      probe.font = font(size);
      const m1 = probe.measureText(PROMPT[0]), m2 = probe.measureText(PROMPT[1]);
      const base = [352, 352 + 1.06 * size], asc = 0.74 * size, desc = 0.22 * size;
      const caretX = M + m2.actualBoundingBoxLeft + m2.actualBoundingBoxRight + 0.2 * size;
      const prompt = Deck.pts.mask((ctx) => {
        ctx.font = font(size);
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(PROMPT[0], M + m1.actualBoundingBoxLeft, base[0]);
        ctx.fillText(PROMPT[1], M + m2.actualBoundingBoxLeft, base[1]);
        ctx.fillRect(caretX, base[1] - asc, Math.max(8, 0.07 * size), asc + desc);
      }, { count: N });

      return { buf, prompt, clip, promptTop: base[0] - asc, waveTop, frameBottom: FR.top + (FR.rows - 1) * FR.pitch };
    },

    beats: [
      {
        layout: (s) => Deck.layout(s.prompt),
        caption: (s) => ({
          headline: 'Снять по тексту',
          labels: [{ text: 'промпт', x: M, y: s.promptTop - 58 }],
          tag: 'schema',
        }),
        move: { ms: 1300, stagger: 'x', spread: 0.45, curl: 0.12 },
      },
      {
        layout: (s) => Deck.layout(s.clip),
        caption: (s) => ({
          headline: 'Снять по тексту',
          labels: [
            { text: 'кадры', x: W - M, y: FR.top - 50, align: 'right' },
            { text: 'звук', x: M, y: WAVE.axis - 40 }, // over the silence before the pluck
          ],
          figure: { value: D11.value, unit: D11.unit, y: 624 },
          tag: 'schema',
          src: { text: D11.src, v: D11.v },
        }),
        // the letters fall apart left to right into frames above and sound below
        move: { ms: 1300, stagger: 'x', spread: 0.45, curl: 0.1 },
        enter(s, info) {
          if (info.dir > 0) Deck.sound.play(s.buf, { delay: 0.8 });
        },
      },
    ],
  });
})();
