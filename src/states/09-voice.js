// State 9 (Б). «Говорить без паузы». A call and a response on the dombra, drawn as two waveforms on
// one time axis and played from the same buffers. The call is ink; the response is accent (it answers).
// Beat 0: the response comes through a pipeline, three hops (ASR → LLM → TTS) in a wide gap.
//         Schematic: the gap is not to scale and carries no number.
// Beat 1: one model, a gap of 320 ms on the same time axis (V-11). The response slides left as a block.
(function () {
  'use strict';
  const Deck = window.Deck, { W, N } = Deck, M = Deck.MARGIN;

  // The one number of this state, fixed in spec.md: V-11, GPT-4o's average audio response time.
  // The 2.8 s / 5.4 s pipeline figures are unverified and appear nowhere, not even as the gap width.
  const D10 = { value: '320', unit: 'мс до ответа', src: 'GPT-4o System Card, 2024', v: 'V-11', gap: 0.32 };
  const PIPE_GAP = 1.5; // s, schematic: wide enough to hear and see three hops; not a measurement

  // The waves use a slightly finer screen than state 4 (4.4 instead of 5) so that 4096 dots fit
  // two thirds of the stage at a natural height; cap is only a guard (about 170 px either side).
  const WAVE = { pitch: 4.4, r: 1.75, axis: 300, cap: 38 };
  // One hop = a small tile of the token-strip material; 3 hops = 300 dots, in beat 1 one tile of 300.
  const HOP = { cols: 10, rows: 10, pitch: 3.6, r: 1.3 };

  // Call: a short rising phrase on one string; response: a falling one. A silent note on the same
  // string damps the last pluck, so each phrase ends cleanly instead of ringing into the gap.
  const CALL = { dur: 1.0, notes: [[0, 'D3'], [0.24, 'A3'], [0.48, 'B3']], damp: 0.92 };
  const RESP = { dur: 1.3, notes: [[0, 'D4'], [0.18, 'B3'], [0.36, 'A3'], [0.62, 'G3']], damp: 1.2 };
  const phrase = (p, seed) =>
    Deck.sound.mix(p.notes.map(([t, f], i) => ({ t, f, string: 0, seed: seed + i })).concat([{ t: p.damp, f: 'D3', string: 0, gain: 0 }]), p.dur);

  Deck.state(9, {
    setup() {
      const snd = Deck.sound, call = phrase(CALL, 41), resp = phrase(RESP, 61);
      const pxs = (W - 2 * M) / (CALL.dur + PIPE_GAP + RESP.dur); // px per second, the same in both beats
      const nCall = Math.round((CALL.dur * pxs) / WAVE.pitch), nResp = Math.round((RESP.dur * pxs) / WAVE.pitch);
      const wc = snd.wave(call, nCall), wr = snd.wave(resp, nResp);

      // Dots per column: as many above and below the axis as the sample extremes call for, scaled so
      // the two waves plus the hop blocks use all 4096 dots (or the cap, whichever comes first).
      const hopDots = 3 * HOP.cols * HOP.rows, budget = N - hopDots;
      // Each side of a column may stand at most 1.25 x the mean of its neighbours (raw heights): this
      // trims the one-column spike of a pluck onset (it read as render dust) and keeps the attack.
      const NEEDLE = 1.25;
      const raw = (w, k, scale) => [Math.min(WAVE.cap, Math.max(1, Math.round(w.max[k] * scale))), Math.min(WAVE.cap, Math.max(1, Math.round(-w.min[k] * scale)))];
      const heights = (w, k, scale) => {
        const h = raw(w, k, scale), nb = [k - 1, k + 1].filter((j) => j >= 0 && j < w.max.length).map((j) => raw(w, j, scale));
        const f = nb.length > 1 ? NEEDLE : 1; // an end column has one neighbour: it may only match it
        return h.map((v, s) => Math.min(v, Math.max(1, Math.round((f * nb.reduce((a, b) => a + b[s], 0)) / nb.length))));
      };
      const count = (scale) => {
        let n = 0;
        for (const w of [wc, wr]) for (let k = 0; k < w.max.length; k++) { const [u, d] = heights(w, k, scale); n += u + d; }
        return n;
      };
      let lo = 1, hi = 400;
      for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (count(mid) > budget) hi = mid; else lo = mid; }
      // rounding leaves a few dots over: they go to the loudest (capped) columns, one each (as in state 4)
      const extra = [];
      for (const [w, id] of [[wc, 0], [wr, 1]]) for (let k = 0; k < w.max.length; k++) { const [u, d] = heights(w, k, lo); extra.push({ id, k, v: u + d }); }
      extra.sort((a, b) => b.v - a.v);
      const bonus = [new Int32Array(nCall), new Int32Array(nResp)];
      for (let k = 0, left = budget - count(lo); left > 0; k++, left--) bonus[extra[k % extra.length].id][extra[k % extra.length].k]++;
      const column = (w, x0, c, add) => {
        const out = [], ext = [];
        for (let k = 0; k < w.max.length; k++) {
          const [u0, d] = heights(w, k, lo), u = u0 + add[k];
          ext.push(Math.max(u, d) * WAVE.pitch);
          for (let m = -u; m < d; m++) out.push({ x: x0 + k * WAVE.pitch, y: WAVE.axis + (m + 0.5) * WAVE.pitch, r: WAVE.r, c });
        }
        out.ext = ext; // half-height of each column in px, for placing labels clear of the dots
        return out;
      };
      const callPts = column(wc, M, Deck.K, bonus[0]);
      const respAt = (gap) => column(wr, M + (CALL.dur + gap) * pxs, Deck.A, bonus[1]);

      // Beat 0: three hops spaced across the wide gap. Beat 1: the same 300 dots as one block.
      const gapX = (gap) => [M + nCall * WAVE.pitch, M + (CALL.dur + gap) * pxs];
      const block = (cx, cols, rows, pitch) => {
        const pts = Deck.pts.grid({ x: cx - ((cols - 1) * pitch) / 2, y: WAVE.axis - ((rows - 1) * pitch) / 2, cols, rows, dx: pitch, r: HOP.r });
        return pts;
      };
      const [g0a, g0b] = gapX(PIPE_GAP), hops = [];
      for (let h = 0; h < 3; h++) hops.push(...block(g0a + ((g0b - g0a) * (h + 1)) / 4, HOP.cols, HOP.rows, HOP.pitch));
      const [g1a, g1b] = gapX(D10.gap);
      const one = block((g1a + g1b) / 2, 15, 20, HOP.pitch);

      // «одна модель» is centred over the tile, as low as the dots under it (call tail, tile, response
      // onset, with 16 px around the text) allow.
      const lbl = { w: 132, cx: (g1a + g1b) / 2 }, resp1 = respAt(D10.gap), r0 = M + (CALL.dur + D10.gap) * pxs;
      const under = (x) => x > lbl.cx - lbl.w / 2 - 16 && x < lbl.cx + lbl.w / 2 + 16;
      let tall = (20 * HOP.pitch) / 2; // the tile itself
      for (let k = 0; k < nCall; k++) if (under(M + k * WAVE.pitch)) tall = Math.max(tall, callPts.ext[k]);
      for (let k = 0; k < nResp; k++) if (under(r0 + k * WAVE.pitch)) tall = Math.max(tall, resp1.ext[k]);
      lbl.y = WAVE.axis - (tall - WAVE.pitch / 2) - WAVE.r - 17 - 30; // ext counts half a pitch past the top dot

      // Playback: the same buffers, call, then silence for the gap, then the response.
      const join = (gap) => {
        const a = Math.round(CALL.dur * snd.SR), g = Math.round(gap * snd.SR), out = new Float32Array(a + g + resp.length);
        out.set(call.subarray(0, a), 0);
        out.set(resp, a + g);
        return out;
      };

      return {
        pxs,
        pipe: { pts: callPts.concat(hops, respAt(PIPE_GAP)), buf: join(PIPE_GAP), gap: [g0a, g0b], hopIdx: callPts.length },
        one: { pts: callPts.concat(one, resp1), buf: join(D10.gap), hopIdx: callPts.length, label: lbl },
      };
    },

    beats: [
      {
        layout: (s) => Deck.layout(s.pipe.pts),
        caption: (s) => ({
          headline: 'Говорить без паузы',
          labels: [{ text: 'ASR → LLM → TTS', x: (s.pipe.gap[0] + s.pipe.gap[1]) / 2, y: WAVE.axis - 74, align: 'center' }],
          tag: 'schema',
        }),
        move: { ms: 1300, stagger: 'x', spread: 0.5, curl: 0.14 },
        enter(s, info) {
          if (info.dir > 0) Deck.sound.play(s.pipe.buf, { delay: 1.3 });
        },
        // While the room hears the silence, each hop swells in turn: the answer is passing through it.
        live: (t, frame, s) => pulse(t, frame, s.pipe.hopIdx, [0, 1, 2].map((h) => [CALL.dur + (PIPE_GAP * h) / 3, CALL.dur + (PIPE_GAP * (h + 1)) / 3]), 100),
      },
      {
        layout: (s) => Deck.layout(s.one.pts),
        caption: (s) => ({
          headline: 'Говорить без паузы',
          labels: [{ text: 'одна модель', x: s.one.label.cx, y: s.one.label.y, align: 'center' }],
          figure: { value: D10.value, unit: D10.unit, y: 622 },
          tag: 'schema',
          src: { text: D10.src, v: D10.v },
        }),
        // the response slides left as one piece; the three hops close into one tile
        move: { ms: 1100, stagger: 'none', spread: 0, curl: 0.04 },
        enter(s, info) {
          if (info.dir > 0) Deck.sound.play(s.one.buf, { delay: 1.1 });
        },
        live: (t, frame, s) => pulse(t, frame, s.one.hopIdx, [[CALL.dur, CALL.dur + D10.gap]], 300),
      },
    ],
  });

  // Swell the dots of hop h (count `per`, starting at index `from`) while t is inside its window.
  // Returns false once the last window has passed, so the scene settles completely.
  function pulse(t, frame, from, windows, per) {
    windows.forEach(([a, b], h) => {
      if (t < a || t > b) return;
      const k = Math.sin((Math.PI * (t - a)) / (b - a));
      for (let i = from + h * per; i < from + (h + 1) * per; i++) frame.r[i] *= 1 + 0.6 * k;
    });
    return t <= windows[windows.length - 1][1];
  }
})();
