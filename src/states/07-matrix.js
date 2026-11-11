// State 7 (А). «Любой вход → любой выход». The one interactive состояние of the deck.
// Bottom right: the 4x4 capability matrix (rows = input, columns = output), each cell a tile of dots:
// native cells at full tone, pipeline cells as quiet pin-dot tiles split by a seam, the chosen cell
// in the accent (it answers). Top: the dombra converts from the chosen input form (left) to the
// chosen output form (right); the model that does it in one call is named between them. A pipeline
// cell routes through a small word in the middle (a stop through text) and says «конвейер».
// Bottom left: the count of native cells, «13 из 16» (V-15, V-16, corrected by V-16a to V-16c).
//
// Control (caption.control): the row and column words and the 16 tiles are buttons. Keyboard, by
// event.code so the Russian layout works: a digit 1-4 picks the input row, a second digit 1-4 within
// 2.5 s picks the output column (alone, the first digit keeps the current output). No deck key is used.
// Beats 0-2 preselect three cells, so a clicker alone can show a native cell, another native cell
// and a pipeline cell. Idle on beat 0 for 25 s (longer than the speaker's opening lines): a slow tour of five cells, stopped by the first input.
(function () {
  'use strict';
  const Deck = window.Deck, { W, N } = Deck, M = Deck.MARGIN;

  const HEAD = 'Любой вход → любой выход';
  const MOD = ['текст', 'изображение', 'звук', 'видео'];

  // Block C of facts.md as corrected on 2026-11-11 (V-16a, V-16b, V-16c), cell by cell (row = input, column = output). One model per native cell;
  // `note` marks the separate image models (the caveat in Block C); видео → звук is partial.
  const CELLS = [
    [{ model: 'GPT-6 Astra' }, { model: 'Nano Banana 2.1', note: 'отдельная модель' }, { model: 'Gemini 3.8 Flash TTS' }, { model: 'Gemini Omni 1.2 Flash' }],
    [{ model: 'Claude Opus 5.5' }, { model: 'GPT-Image-2.6', note: 'отдельная модель' }, { model: 'Gemini 3.8 Live' }, { model: 'Gemini Omni 1.2 Flash' }],
    [{ model: 'GPT-Transcribe' }, { pipe: true }, { model: 'GPT-Realtime-1.5' }, { pipe: true }],
    [{ model: 'Gemini 3.8 Flash' }, { model: 'Nano Banana 2.1', note: 'отдельная модель' }, { pipe: true, partial: true }, { model: 'Gemini Omni 1.2 Flash' }],
  ];
  const NATIVE = CELLS.flat().filter((d) => !d.pipe).length; // 13, counted from the table above
  const FIG = { value: String(NATIVE), unit: 'из 16', src: 'каталоги OpenAI, Google, Anthropic, ноябрь 2026', v: 'V-15 V-16' };

  // Cells as [input, output]. Beats preselect these; the idle tour walks TOUR.
  const PRESET = [[1, 0], [0, 3], [2, 1]]; // изображение → текст, текст → видео, звук → изображение (конвейер)
  const TOUR = [[0, 1], [2, 0], [2, 3], [0, 3], [3, 0]]; // [2, 3] звук → видео keeps one pipeline in the tour
  const IDLE_MS = 25000, HOLD_MS = 2600, PENDING_MS = 2500;
  // A pick: everything gathers into the input form, then streams out to the output form (through the
  // word in the middle on a pipeline). Moves of the three stages:
  const STAGE = {
    gather: { ms: 950, stagger: 'x', spread: 0.35, curl: 0.12 },
    stop: { ms: 1000, stagger: (i, fx, fy, tx) => tx, spread: 0.45, curl: 0.08 },
    fin: { ms: 1150, stagger: (i, fx, fy, tx) => tx, spread: 0.5, curl: 0.1 },
  };

  // ---- geometry ----------------------------------------------------------------------------------
  // The conversion band under the headline: input slot left, output slot right, the model between.
  const BAND = { y0: 132, y1: 378, cy: 255 };
  const SLOT_W = 432;
  const IN = { x0: M, x1: M + SLOT_W }, OUT = { x0: W - M - SLOT_W, x1: W - M };
  const MID = { cx: W / 2, w: 168 };
  // The matrix: 4 x 4 tiles of 17 x 6 dots on a straight 6.4 px screen, bottom right.
  const T = { cols: 17, rows: 6, p: 6.4, colPitch: 136, rowPitch: 48, rFull: 2.75, rPipe: 1.15, rSeam: Deck.R_MIN };
  T.w = (T.cols - 1) * T.p;
  T.h = (T.rows - 1) * T.p;
  T.x0 = W - M - 3 - 3 * T.colPitch - T.w; // first dot of the first column; the last tile ends at x 1213
  T.y0 = 636 - 3 * T.rowPitch - T.h; // the last row's dots end at y 636, clear of the counter
  const tileCx = (o) => T.x0 + o * T.colPitch + T.w / 2;
  const tileCy = (i) => T.y0 + i * T.rowPitch + T.h / 2;
  const HEADS = { rowRight: T.x0 - 12, colY: T.y0 - 48 }; // row words end here; column words sit on this top
  const CTRL = { x: T.x0 - 190, y: HEADS.colY - 4 };
  const TILE_DOTS = 16 * T.cols * T.rows; // 1632
  const C = N - TILE_DOTS; // dots for the conversion: 2464
  const MID_DOTS = 300;

  Deck.state(7, {
    setup() {
      const s = { cell: PRESET[0].slice(), pending: null, gen: 0, anim: 0, timers: [], userDrove: false, forms: new Map(), cache: new Map(), ui: null };

      // Fixed identity of the tile dots: their indices come from beat 0's left-to-right order, and
      // stay the same for every cell, so a pick only moves the conversion dots.
      const ref = tiles(null).map((p) => Object.assign({}, p, { tile: true }));
      const all = Deck.pts.sortX(ref.concat(conversion(s, PRESET[0]).fin), 6);
      s.tileIdx = new Int32Array(TILE_DOTS);
      all.forEach((p, i) => { if (p.tile) s.tileIdx[p.k] = i; });

      s.layouts = (cell) => layoutsOf(s, cell);
      bindInput(s);
      return s;
    },

    beats: PRESET.map((cell, b) => ({
      layout: (s) => s.layouts(cell).fin,
      caption: (s) => {
        // a beat (re)starts here, also in ?still=1: its preset cell, no pending digit, no running tour
        reset(s);
        s.cell = cell.slice();
        s.beat = b;
        sync(s);
        return captionOf(s, cell);
      },
      move: b === 0 ? { ms: 1300, stagger: 'x', spread: 0.45, curl: 0.12 } : { ms: 1200, stagger: (i, fx, fy, tx) => tx, spread: 0.5, curl: 0.1 },
      enter(s) {
        s.userDrove = false;
        if (b === 0) later(s, IDLE_MS, () => tour(s, 0));
        warm(s);
      },
    })),
  });

  // ---- the matrix of tiles -------------------------------------------------------------------------

  // 1632 tile points, tile by tile (k = tile * 102 + dot). `chosen` = [i, o] gets the accent.
  function tiles(chosen) {
    const out = [];
    for (let i = 0; i < 4; i++)
      for (let o = 0; o < 4; o++) {
        const d = CELLS[i][o], on = chosen && chosen[0] === i && chosen[1] === o;
        for (let col = 0; col < T.cols; col++)
          for (let row = 0; row < T.rows; row++) {
            let r = T.rFull;
            if (d.pipe) {
              // two halves with a seam: two models joined. The partial cell keeps one half at mid tone.
              const seam = col === 8;
              r = seam ? T.rSeam : d.partial && col < 8 ? 1.75 : T.rPipe;
              if (on && !seam) r += 0.45;
            }
            out.push({ x: T.x0 + o * T.colPitch + col * T.p, y: T.y0 + i * T.rowPitch + row * T.p, r, c: on ? Deck.A : Deck.K, k: out.length });
          }
      }
    return out;
  }

  // ---- the forms of the dombra ---------------------------------------------------------------------

  const slotOf = (side) => (side === 'in' ? IN : OUT);

  // The word, centred on the band. `str` is «домбра» (or «dombra» for текст → текст: a translation).
  function wordForm(str, x0, w, cy, count) {
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = `900 200px "${Deck.FONT_DOTS}"`;
    const m = probe.measureText(str), k = w / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
    const base = cy + ((m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) * 200 * k) / 200 / 2;
    return Deck.pts.text(str, { x: x0, y: base, fit: w, count });
  }

  // The picture: the dombra on its own screen, tilted to fill the slot. `tilt` flips for an edited copy.
  function imageForm(slot, count, tilt) {
    const a = tilt * 16, th = (Math.abs(a) * Math.PI) / 180;
    const length = SLOT_W / (Math.cos(th) + 0.21 * Math.sin(th));
    return Deck.pts.dombra({ cx: (slot.x0 + slot.x1) / 2, cy: BAND.cy, length, angle: a, count });
  }

  // The sound: the plucked string's first 1.2 s as a waveform (dots stacked to the sample extremes),
  // computed from the same buffer the deck plays. D3 by default, G3 for the answer of звук → звук.
  function soundForm(slot, count, note) {
    const snd = Deck.sound, buf = snd.string(note), pitch = 4, cols = Math.floor(SLOT_W / pitch) + 1;
    const wv = snd.wave(buf, cols, { to: Math.floor(1.2 * snd.SR) });
    const size = (sc) => {
      let n = 0;
      for (let c = 0; c < cols; c++) n += Math.max(1, Math.round(wv.max[c] * sc)) + Math.max(1, Math.round(-wv.min[c] * sc));
      return n;
    };
    let lo = 1, hi = 600;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if (size(mid) > count) hi = mid;
      else lo = mid;
    }
    const up = [], down = [];
    for (let c = 0; c < cols; c++) {
      up.push(Math.max(1, Math.round(wv.max[c] * lo)));
      down.push(Math.max(1, Math.round(-wv.min[c] * lo)));
    }
    const loud = [...Array(cols).keys()].sort((a, b) => up[b] + down[b] - up[a] - down[a]);
    for (let k = 0, left = count - size(lo); left > 0; k++, left--) up[loud[k % cols]]++;
    const out = [];
    for (let c = 0; c < cols; c++)
      for (let m = -up[c]; m < down[c]; m++) out.push({ x: slot.x0 + c * pitch, y: BAND.cy + (m + 0.5) * pitch * 0.82, r: 1.55, c: Deck.K });
    return out;
  }

  // The video: the dombra in a stack of frames in depth, as in states 5 and 6 (frame 0 in front,
  // older frames behind it up and to the right, smaller, their hidden dots dropped).
  function videoForm(slot, count, flip) {
    const S = { frames: 3, F: 1400, length: 340, dX: 46, dY: flip ? -40 : 42, dZ: 260, gap: 1.3 };
    const cx = slot.x0 + 172, cy = BAND.cy + (flip ? -36 : 40);
    const make = (n) => {
      const one = Deck.pts.dombra({ cx: 0, cy: 0, length: S.length, count: n });
      const fr = [];
      for (let k = 0; k < S.frames; k++) {
        const f = S.F / (S.F + k * S.dZ), x0 = cx + k * S.dX, y0 = cy - k * S.dY;
        fr.push(one.map((p) => ({ x: x0 + p.x * f, y: y0 + p.y * f, r: Math.max(Deck.R_MIN, p.r * f), c: p.c, pitch: one.pitch * f })));
      }
      const vis = [];
      fr.forEach((pts, k) => vis.push(pts.filter((p) => !fr.slice(0, k).some((front) => front.some((q) => Math.abs(q.x - p.x) < 8 && Math.hypot(q.x - p.x, q.y - p.y) < S.gap * q.pitch)))));
      return vis;
    };
    let lo = 60, hi = count, vis;
    while (hi - lo > 2) {
      const mid = Math.floor((lo + hi) / 2);
      if (make(mid).reduce((n, v) => n + v.length, 0) >= count) hi = mid;
      else lo = mid;
    }
    vis = make(hi);
    let all = [].concat(...vis);
    all = all.sort((a, b) => a.r - b.r).slice(all.length - count); // drop the faintest surplus
    for (const p of all) delete p.pitch;
    return all;
  }

  // One form of one kind in one place, cached: masks and stacks are not cheap.
  function form(s, kind, where, count, variant) {
    const key = [kind, where, count, variant || 0].join('|');
    if (s.forms.has(key)) return s.forms.get(key);
    let pts;
    if (where === 'mid') pts = wordForm('домбра', MID.cx - MID.w / 2, MID.w, BAND.cy + 14, count);
    else {
      const slot = slotOf(where);
      if (kind === 0) pts = wordForm(variant ? 'dombra' : 'домбра', slot.x0, SLOT_W, BAND.cy, count);
      else if (kind === 1) pts = imageForm(slot, count, variant ? 1 : -1);
      else if (kind === 2) pts = soundForm(slot, count, variant ? 'G3' : 'D3');
      else pts = videoForm(slot, count, !!variant);
    }
    pts = Array.from(pts, (p) => ({ x: p.x, y: p.y, r: p.r, c: p.c }));
    s.forms.set(key, pts);
    return pts;
  }

  // ---- one cell as dots ----------------------------------------------------------------------------

  // The conversion for cell [i, o]: final points (exactly C, left to right) and, for each, where it
  // waits while the input form is gathering (g1) and, on a pipeline, at the stop in the middle (g2).
  function conversion(s, cell) {
    const [i, o] = cell, d = CELLS[i][o];
    const nMid = d.pipe ? MID_DOTS : 0, nIn = Math.floor((C - nMid) / 2), nOut = C - nMid - nIn;
    const fin = [];
    const inF = form(s, i, 'in', nIn, 0);
    const outF = form(s, o, 'out', nOut, i === o ? 1 : 0); // same модальность: a translated word, an edited picture...
    const midF = nMid ? form(s, 0, 'mid', nMid, 0) : [];
    inF.forEach((p) => fin.push(Object.assign({}, p, { g1: p, g2: p })));
    midF.forEach((p, k) => fin.push(Object.assign({}, p, { g1: inF[Math.floor((k * inF.length) / midF.length)], g2: p })));
    outF.forEach((p, k) => {
      const g1 = inF[Math.floor((k * inF.length) / outF.length)];
      fin.push(Object.assign({}, p, { g1, g2: nMid ? midF[Math.floor((k * midF.length) / outF.length)] : p }));
    });
    return { fin: Deck.pts.sortX(fin, 6), pipe: !!d.pipe };
  }

  // Full layouts for a cell: fin (settled), gather (only the input form), and stop (pipeline middle).
  function layoutsOf(s, cell) {
    const key = cell.join(',');
    if (s.cache.has(key)) return s.cache.get(key);
    const conv = conversion(s, cell);
    const build = (tilePts, pick) => {
      const out = new Array(N);
      for (const p of tilePts) out[s.tileIdx[p.k]] = p;
      let k = 0;
      for (let i = 0; i < N; i++) if (!out[i]) out[i] = pick(conv.fin[k++]);
      return Deck.layout(out);
    };
    const lit = tiles(cell), plain = tiles(null);
    const L = {
      fin: build(lit, (p) => p),
      gather: build(plain, (p) => p.g1),
      stop: conv.pipe ? build(lit, (p) => p.g2) : null,
    };
    s.cache.set(key, L);
    return L;
  }

  // Compute the forms of the tour cells while the room looks at the first picture.
  function warm(s) {
    const todo = TOUR.concat(PRESET).filter((c) => !s.cache.has(c.join(',')));
    if (Deck.still) return;
    const step = () => {
      if (!todo.length || !active()) return;
      layoutsOf(s, todo.shift());
      setTimeout(step, 60);
    };
    setTimeout(step, 1600);
  }

  // ---- captions ------------------------------------------------------------------------------------

  function captionOf(s, cell) {
    const d = CELLS[cell[0]][cell[1]];
    const labels = [{ text: 'вход → выход', x: HEADS.rowRight + 2, y: HEADS.colY + 4, align: 'right' }];
    if (!d.pipe) {
      labels.push({ text: d.model, x: MID.cx, y: d.note ? BAND.cy - 40 : BAND.cy - 18, align: 'center', upright: true });
      if (d.note) labels.push({ text: d.note, x: MID.cx, y: BAND.cy - 6, align: 'center' });
    } else {
      labels.push({ text: d.partial ? 'частично' : 'конвейер', x: MID.cx, y: BAND.cy - 78, align: 'center' });
      if (d.partial) labels.push({ text: 'звук внутри видео', x: MID.cx, y: BAND.cy + 40, align: 'center' });
    }
    return {
      headline: HEAD,
      labels,
      figure: { value: FIG.value, unit: FIG.unit, y: 636 },
      tag: 'schema',
      src: { text: FIG.src, v: FIG.v },
      control: { x: CTRL.x, y: CTRL.y, key: 'matrix', build: (el) => buildControl(s, el) },
    };
  }

  // ---- the control ---------------------------------------------------------------------------------

  // setAttribute, guarded for the Node smoke test's fake DOM
  const attr = (node, k, v) => node.setAttribute && node.setAttribute(k, v);

  function buildControl(s, el) {
    const w = W - M - CTRL.x, h = 640 - CTRL.y;
    Object.assign(el.style, { width: w + 'px', height: h + 'px' });
    attr(el, 'role', 'group');
    attr(el, 'aria-label', 'Матрица: вход → выход');
    const mk = (text, label, css, onPick) => {
      const b = document.createElement('button');
      b.type = 'button';
      if (text) b.textContent = text;
      if (label) attr(b, 'aria-label', label);
      Object.assign(b.style, { position: 'absolute' }, css);
      b.addEventListener('click', (e) => {
        touched(s);
        onPick();
        if (e.detail) b.blur(); // a mouse or tap pick leaves Space and Enter to the deck
      });
      el.appendChild(b);
      return b;
    };
    const ui = { rows: [], cols: [], tiles: [] };
    for (let i = 0; i < 4; i++)
      ui.rows.push(mk(MOD[i], 'вход: ' + MOD[i], { right: W - M - HEADS.rowRight + 'px', top: tileCy(i) - CTRL.y - 19 + 'px', padding: '6px 12px' }, () => pick(s, [i, s.cell[1]])));
    for (let o = 0; o < 4; o++)
      ui.cols.push(mk(MOD[o], 'выход: ' + MOD[o], { left: tileCx(o) - CTRL.x + 'px', top: HEADS.colY - CTRL.y + 'px', transform: 'translateX(-50%)', padding: '6px 10px' }, () => pick(s, [s.cell[0], o])));
    for (let i = 0; i < 4; i++)
      for (let o = 0; o < 4; o++) {
        const d = CELLS[i][o];
        const what = d.pipe ? (d.partial ? 'частично' : 'конвейер') : d.model;
        ui.tiles.push(mk('', `${MOD[i]} → ${MOD[o]}: ${what}`, {
          left: T.x0 + o * T.colPitch - 8 - CTRL.x + 'px', top: T.y0 + i * T.rowPitch - 8 - CTRL.y + 'px',
          width: T.w + 16 + 'px', height: T.h + 16 + 'px', padding: '0', borderRadius: '4px', background: 'none',
        }, () => pick(s, [i, o])));
      }
    s.ui = ui;
    sync(s);
  }

  // Pressed states follow the chosen cell (and a pending input digit).
  function sync(s) {
    const ui = s.ui;
    if (!ui) return;
    const inRow = s.pending != null ? s.pending : s.cell[0];
    ui.rows.forEach((b, i) => attr(b, 'aria-pressed', String(i === inRow)));
    ui.cols.forEach((b, o) => attr(b, 'aria-pressed', String(o === s.cell[1])));
    ui.tiles.forEach((b, k) => attr(b, 'aria-pressed', String(k === s.cell[0] * 4 + s.cell[1])));
  }

  // ---- picking a cell: the dombra converts ---------------------------------------------------------

  const active = () => window.__deck && window.__deck.state === 7;

  function pick(s, cell, fromTour) {
    if (!active()) return;
    if (!fromTour) {
      s.pending = null;
      clearT(s.pendingTimer);
    }
    s.cell = cell.slice();
    sync(s);
    Deck.captions.show(captionOf(s, cell), false);
    const L = layoutsOf(s, cell), gen = ++s.anim;
    const canvas = document.getElementById('dots'), ctx = canvas && canvas.getContext('2d');
    if (!ctx || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      Deck.dots.set(L.fin);
      if (ctx) Deck.dots.draw(ctx);
      return;
    }
    // gather into the input form, then stream out (through the stop in the middle on a pipeline)
    const stages = [[L.gather, STAGE.gather], ...(L.stop ? [[L.stop, STAGE.stop]] : []), [L.fin, STAGE.fin]];
    const run = (k) => {
      if (k >= stages.length || gen !== s.anim || !active()) return;
      Deck.dots.move(stages[k][0], stages[k][1], performance.now());
      const tick = (now) => {
        if (gen !== s.anim || !active()) return;
        const busy = Deck.dots.step(now);
        Deck.dots.draw(ctx);
        if (busy) requestAnimationFrame(tick);
        else run(k + 1);
      };
      requestAnimationFrame(tick);
    };
    run(0);
  }

  // The idle tour: the cells of TOUR in turn, until the first input.
  function tour(s, k) {
    if (s.userDrove || !active()) return;
    pick(s, TOUR[k % TOUR.length], true);
    const stagesMs = layoutsOf(s, TOUR[k % TOUR.length]).stop ? 3100 : 2100;
    later(s, stagesMs + HOLD_MS, () => tour(s, k + 1));
  }

  // ---- timers and input ----------------------------------------------------------------------------

  // clearTimeout is guarded: the Node smoke test's fake window has setTimeout only
  const clearT = (id) => { if (id != null && typeof clearTimeout === 'function') clearTimeout(id); };

  function later(s, ms, fn) {
    if (Deck.still) return;
    const gen = s.gen;
    const id = setTimeout(() => {
      s.timers = s.timers.filter((t) => t !== id);
      if (gen === s.gen && active()) fn();
    }, ms);
    s.timers.push(id);
  }

  function reset(s) {
    s.gen++;
    s.anim++;
    s.timers.forEach(clearT);
    s.timers = [];
    s.pending = null;
    clearT(s.pendingTimer);
  }

  // The first input on this state stops the tour for good (until the state is entered again).
  function touched(s) {
    if (s.userDrove) return;
    s.userDrove = true;
    s.gen++; // drops the idle and tour timers
  }

  const DECK_KEYS = new Set(['ArrowRight', 'ArrowLeft', 'PageUp', 'PageDown', 'Space', 'Enter', 'NumpadEnter', 'Home', 'End', 'Backspace', 'KeyF', 'KeyM']);

  function bindInput(s) {
    if (Deck.still) return;
    addEventListener('keydown', (e) => {
      if (!active() || e.metaKey || e.ctrlKey || e.altKey || DECK_KEYS.has(e.code)) return;
      touched(s);
      const m = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
      if (!m) return;
      e.preventDefault();
      const k = +m[1] - 1;
      if (s.pending == null) {
        // first digit: the input row; the output follows with a second digit, or stays as it is
        s.pending = k;
        sync(s);
        clearT(s.pendingTimer);
        s.pendingTimer = setTimeout(() => {
          if (s.pending != null && active()) pick(s, [s.pending, s.cell[1]]);
        }, PENDING_MS);
      } else pick(s, [s.pending, k]);
    });
    // a tap or click inside the matrix counts as input; elsewhere it is the deck's navigation
    addEventListener('pointerdown', (e) => {
      if (active() && e.target.closest && e.target.closest('[data-role="control"]')) touched(s);
    });
  }
})();
