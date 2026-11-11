// Sound: a plucked string rendered to a buffer first. Visuals read the buffer, playback plays the
// same buffer, so picture and sound cannot disagree and still renders are reproducible.
// The dombra has two strings a fourth apart: D3 and G3.
(function () {
  'use strict';
  const Deck = window.Deck;
  const SR = 44100;
  const sound = (Deck.sound = {
    SR,
    NOTES: { D3: 146.83, G3: 196.0, A3: 220.0, B3: 246.94, D4: 293.66, E4: 329.63 },
    unlocked: false,
  });
  const hz = (f) => (typeof f === 'string' ? sound.NOTES[f] : f);
  const cache = new Map();

  function normalise(buf, peak) {
    let m = 0;
    for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i]));
    if (m > 0) for (let i = 0; i < buf.length; i++) buf[i] *= peak / m;
    return buf;
  }

  // Deck.sound.pluck(freq, opts) -> Float32Array at 44.1 kHz. `freq` is Hz or a name from NOTES.
  //   opts { dur = 2.4 s, t60 = 2.6 s (decay of the fundamental), pick = 0.22 (pluck point along
  //          the string), bright = 0.5 (0 dull .. 1 harsh), seed = 7 }
  // Karplus-Strong with a tuning allpass, a triangular pluck shape and two wooden-body resonances.
  sound.pluck = function (freq, opts) {
    const f0 = hz(freq);
    const o = Object.assign({ dur: 2.4, t60: 2.6, pick: 0.22, bright: 0.5, seed: 7 }, opts);
    const key = JSON.stringify([f0, o]);
    if (cache.has(key)) return cache.get(key);
    const n = Math.floor(o.dur * SR), dry = new Float32Array(n);
    const total = SR / f0 - 0.5; // the averaging filter below delays by half a sample
    const L = Math.floor(total - 0.1), frac = total - L, C = (1 - frac) / (1 + frac);
    const rho = Math.pow(10, -3 / (f0 * o.t60));
    // the string pulled into a triangle at the pick point, plus a little noise for the attack
    const rnd = Deck.rng(o.seed), line = new Float32Array(L), pk = Math.max(1, o.pick * L);
    let lp = 0, mean = 0;
    for (let i = 0; i < L; i++) {
      lp += 0.35 * (rnd() * 2 - 1 - lp);
      line[i] = (i < pk ? i / pk : (L - i) / (L - pk)) + o.bright * 0.5 * lp;
      mean += line[i] / L;
    }
    for (let i = 0; i < L; i++) line[i] -= mean;
    let idx = 0, prev = 0, apx = 0, apy = 0;
    for (let k = 0; k < n; k++) {
      const y = line[idx];
      const avg = rho * 0.5 * (y + prev);
      prev = y;
      const ap = C * avg + apx - C * apy;
      apx = avg;
      apy = ap;
      line[idx] = ap;
      dry[k] = y;
      idx = idx + 1 === L ? 0 : idx + 1;
    }
    // body: two resonators mixed under the string
    const out = new Float32Array(n);
    const res = [[185, 9, 0.22], [410, 12, 0.12]].map(([f, q, g]) => {
      const w = (2 * Math.PI * f) / SR, r = Math.exp(-w / (2 * q));
      return { a1: 2 * r * Math.cos(w), a2: -r * r, g: g * (1 - r), y1: 0, y2: 0 };
    });
    for (let k = 0; k < n; k++) {
      let s = dry[k];
      for (const b of res) {
        const y = dry[k] + b.a1 * b.y1 + b.a2 * b.y2;
        b.y2 = b.y1;
        b.y1 = y;
        s += b.g * y;
      }
      out[k] = s;
    }
    const fin = Math.floor(0.002 * SR), fout = Math.floor(0.12 * SR);
    for (let k = 0; k < fin; k++) out[k] *= k / fin;
    for (let k = 0; k < fout; k++) out[n - 1 - k] *= k / fout;
    normalise(out, 0.85);
    cache.set(key, out);
    return out;
  };

  // Deck.sound.mix(events, dur) -> Float32Array. events: [{ t (s), f (Hz or note name), gain = 1,
  //   string (0 or 1; a new note on the same string damps the previous one), ...pluck opts }]
  sound.mix = function (events, dur) {
    const n = Math.floor(dur * SR), out = new Float32Array(n);
    const sorted = events.slice().sort((a, b) => a.t - b.t);
    sorted.forEach((e, i) => {
      const note = sound.pluck(e.f, { dur: Math.min(3, dur), t60: e.t60 || 2.6, pick: e.pick || 0.22, bright: e.bright || 0.5, seed: e.seed || 7 + i });
      const start = Math.floor(e.t * SR);
      let end = n;
      if (e.string != null) {
        const next = sorted.slice(i + 1).find((x) => x.string === e.string);
        if (next) end = Math.min(n, Math.floor(next.t * SR) + Math.floor(0.03 * SR));
      }
      const fade = Math.floor(0.03 * SR), g = e.gain == null ? 1 : e.gain;
      for (let k = start; k < end && k - start < note.length; k++) {
        const tail = end < n ? Deck.clamp((end - k) / fade, 0, 1) : 1;
        out[k] += note[k - start] * g * tail;
      }
    });
    return normalise(out, 0.85);
  };

  // The three buffers the deck uses. All cached; all deterministic.
  sound.string = (name) => sound.pluck(name || 'D3'); // one open string
  sound.strum = function () {
    // both open strings, the way a dombra is struck
    if (!cache.has('strum')) cache.set('strum', sound.mix([{ t: 0, f: 'D3', seed: 3 }, { t: 0.028, f: 'G3', seed: 5 }], 2.6));
    return cache.get('strum');
  };
  sound.motif = function () {
    // a short pentatonic motif of our own (G A B D E over the open D string); not a named kui
    if (!cache.has('motif')) {
      const m = [[0, 'G3'], [0.3, 'A3'], [0.45, 'B3'], [0.6, 'D4'], [0.9, 'B3'], [1.05, 'A3'], [1.2, 'G3']];
      const ev = m.map(([t, f], i) => ({ t, f, string: 1, seed: 11 + i }));
      for (const t of [0, 0.6, 1.2]) ev.push({ t: t + 0.012, f: 'D3', string: 0, gain: 0.8, seed: 31 + t * 10 });
      cache.set('motif', sound.mix(ev, 3.4));
    }
    return cache.get('motif');
  };

  // ---- analysis: the same buffer, as pictures ------------------------------------------------------

  // Deck.sound.wave(buf, cols, { from = 0, to = buf.length }) -> { min, max, rms } (Float32Array(cols))
  // Sample extremes per column, the way an audio editor draws a waveform.
  sound.wave = function (buf, cols, opts) {
    const o = Object.assign({ from: 0, to: buf.length }, opts);
    const min = new Float32Array(cols), max = new Float32Array(cols), rms = new Float32Array(cols);
    const step = (o.to - o.from) / cols;
    for (let c = 0; c < cols; c++) {
      const a = Math.floor(o.from + c * step), b = Math.max(a + 1, Math.floor(o.from + (c + 1) * step));
      let lo = Infinity, hi = -Infinity, sq = 0;
      for (let k = a; k < b; k++) {
        const v = buf[k] || 0;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
        sq += v * v;
      }
      min[c] = lo;
      max[c] = hi;
      rms[c] = Math.sqrt(sq / (b - a));
    }
    return { min, max, rms };
  };

  // Power at one frequency over a windowed segment (Goertzel).
  function goertzel(seg, f) {
    const k = 2 * Math.cos((2 * Math.PI * f) / SR);
    let s1 = 0, s2 = 0;
    for (let i = 0; i < seg.length; i++) {
      const s0 = seg[i] + k * s1 - s2;
      s2 = s1;
      s1 = s0;
    }
    return s1 * s1 + s2 * s2 - k * s1 * s2;
  }

  function segment(buf, centre, win) {
    const seg = new Float32Array(win), a = Math.round(centre - win / 2);
    for (let i = 0; i < win; i++) {
      const k = a + i;
      if (k >= 0 && k < buf.length) seg[i] = buf[k] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (win - 1)));
    }
    return seg;
  }

  // Deck.sound.spectrogram(buf, opts) -> { cols, rows, v, freqs }
  //   opts { cols = 128, rows = 32, fmin, fmax (Hz, linear spacing, both ends included),
  //          win = 4096 (samples, Hann), from = 0, to = buf.length, floor = -54 (dB) }
  //   v is Float32Array(cols * rows), v[col * rows + row] in 0..1 (0 = floor dB or less, 1 = the
  //   loudest cell); row 0 is fmin. freqs is Float32Array(rows).
  sound.spectrogram = function (buf, opts) {
    const o = Object.assign({ cols: 128, rows: 32, fmin: 80, fmax: 2400, win: 4096, from: 0, to: buf.length, floor: -54 }, opts);
    const v = new Float32Array(o.cols * o.rows), freqs = new Float32Array(o.rows);
    for (let r = 0; r < o.rows; r++) freqs[r] = o.rows === 1 ? o.fmin : o.fmin + ((o.fmax - o.fmin) * r) / (o.rows - 1);
    let top = 1e-30;
    for (let c = 0; c < o.cols; c++) {
      const seg = segment(buf, o.from + ((c + 0.5) * (o.to - o.from)) / o.cols, o.win);
      for (let r = 0; r < o.rows; r++) {
        const p = goertzel(seg, freqs[r]);
        v[c * o.rows + r] = p;
        if (p > top) top = p;
      }
    }
    for (let i = 0; i < v.length; i++) v[i] = Deck.clamp(1 - (10 * Math.log10(v[i] / top + 1e-30)) / o.floor, 0, 1);
    return { cols: o.cols, rows: o.rows, v, freqs };
  };

  // Deck.sound.pitch(buf) -> Hz of the strongest partial between 60 and 2000 Hz (for the check).
  sound.pitch = function (buf) {
    const win = Math.min(16384, buf.length), seg = segment(buf, Math.floor(0.05 * SR) + win / 2, win);
    let best = 0, bf = 0;
    for (let f = 60; f <= 2000; f += 1) {
      const p = goertzel(seg, f);
      if (p > best) { best = p; bf = f; }
    }
    const c = bf;
    for (let f = c - 1; f <= c + 1; f += 0.05) {
      const p = goertzel(seg, f);
      if (p > best) { best = p; bf = f; }
    }
    return bf;
  };

  // ---- playback ------------------------------------------------------------------------------------------

  let ac = null, master = null, live = [];

  // Called by the engine on the first key press or tap.
  sound.unlock = function () {
    if (Deck.still) return;
    try {
      if (!ac) {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain();
        master.gain.value = Deck.muted ? 0 : 1;
        master.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
      sound.unlocked = true;
    } catch (e) {
      /* no audio device: the deck stays silent and complete */
    }
  };

  // Deck.sound.play(buf, { gain = 1, delay = 0 (s) }) -> true when the buffer was scheduled.
  // Silent before the first key press, when muted, and in ?still=1.
  sound.play = function (buf, opts) {
    const o = Object.assign({ gain: 1, delay: 0 }, opts);
    if (!ac || Deck.still) return false;
    const ab = ac.createBuffer(1, buf.length, SR);
    ab.copyToChannel(buf, 0);
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = ab;
    g.gain.value = o.gain;
    src.connect(g).connect(master);
    src.start(ac.currentTime + o.delay);
    live.push({ src, g });
    src.onended = () => { live = live.filter((x) => x.src !== src); };
    return true;
  };

  // Fade out whatever is sounding (the engine calls this on every navigation step).
  sound.stop = function () {
    if (!ac) return;
    for (const { src, g } of live) {
      try {
        g.gain.setTargetAtTime(0, ac.currentTime, 0.02);
        src.stop(ac.currentTime + 0.15);
      } catch (e) { /* already stopped */ }
    }
    live = [];
  };

  sound.setMuted = function (m) {
    Deck.muted = !!m;
    if (master) master.gain.setTargetAtTime(Deck.muted ? 0 : 1, ac.currentTime, 0.015);
  };
})();
