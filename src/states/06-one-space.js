// State 6 (А). «Было: конвейер. Стало: одно пространство». No number.
// Beat 0: four islands in a row, each its own small space (a pale tint) holding the same dombra in
// one модальность: the word, the picture, the wave, the frames. Pipes join them: a chain of separate
// models. Beat 1: the pipes and shores go; the islands merge into one shared space, where the four
// forms of «домбра» sit together as one neighbourhood, with two other concepts as words in dots:
// «скрипка» next to it, «верблюд» far off.
// Both beats are a «схема». The order текст, изображение, звук, видео is the order of state 7's
// matrix, which grows from here.
(function () {
  'use strict';
  const Deck = window.Deck, { W, H, N } = Deck, M = Deck.MARGIN;
  const HEAD = 'От конвейера —\nк одному пространству';
  const KINDS = ['word', 'pic', 'wave', 'frames'];

  // Beat 0: four island discs of radius RD centred on the row y = ROW, pipes in the gaps.
  const ROW = 392, RD = 120, STEP = (W - 2 * M - 2 * RD) / 3;
  const isleX = (k) => M + RD + k * STEP;
  const FORM0 = { w: 192, count: 900, word: 560 }; // picture, wave and frames on one screen; the word on a finer one
  const ISLES = 2560; // dots of the four island tints; what is left parks in the reserve
  const ISLE_R = [0.95, 1.15]; // island dot radius, centre .. shore
  // Beat 1: one shared space (a superellipse, so its corners hold the forms), the four forms close,
  // two other concepts as words in dots at the size of «домбра».
  const SPACE = { cx: 640, cy: 410, rx: 574, ry: 226, p: 3.5 };
  const FORM1 = { w: 214, word: 196, count: 860, words: 1350 }; // picture, wave, frames; the three words
  const HOME = [[300, 320], [530, 320], [302, 500], [532, 502]];
  const NEAR = { x: 768, y: 414, text: 'скрипка' }, FAR = { x: 1020, y: 552, text: 'верблюд' };
  const GROUND_R = [1.05, 1.3]; // ground dot radius, centre .. shore: the edge of the space stays visible

  // ---- drawing the four forms into a canvas (ink = alpha) ----

  // «домбра» at ink width w; `text` (another word) is set at the same font size, so all words share
  // one height
  function drawWord(ctx, cx, cy, w, text) {
    ctx.font = `900 100px "${Deck.FONT_DOTS}"`;
    let m = ctx.measureText('домбра');
    const size = (100 * w) / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
    ctx.font = `900 ${size}px "${Deck.FONT_DOTS}"`;
    m = ctx.measureText(text || 'домбра');
    const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    ctx.fillText(text || 'домбра', cx - inkW / 2 + m.actualBoundingBoxLeft, cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  }

  // the silhouette, with the neck drawn a little bolder so it survives a small size
  // the silhouette, with what makes it a dombra at a small size: a bolder neck and head, a pale
  // soundboard inside a dark rim, the sound hole
  function dombra(ctx, o) {
    const erase = ctx.globalCompositeOperation !== 'source-over';
    Deck.dombra.draw(ctx, o);
    const L = o.length;
    ctx.save();
    ctx.translate(o.cx, o.cy);
    ctx.rotate((o.angle * Math.PI) / 180);
    ctx.lineWidth = Math.max(3, L * 0.026);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.12 * L, 0);
    ctx.lineTo(0.4 * L, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0.445 * L, 0, 0.06 * L, 0.03 * L, 0, 0, 2 * Math.PI);
    ctx.fill();
    if (!erase) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(-0.345 * L, 0, 0.115 * L, 0.074 * L, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(-0.27 * L, 0, Math.max(2.5, 0.017 * L), 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
  }

  const picOpts = (cx, cy, w) => ({ cx, cy, length: w / Math.cos((36 * Math.PI) / 180), angle: -36 });
  // three frames of the dombra in depth, as in state 5, front first
  const frameOpts = (cx, cy, w) => [0, 1, 2].map((k) => ({ cx: cx - w * 0.1 + k * w * 0.11, cy: cy + w * 0.15 - k * w * 0.15, length: w * 0.8 * (1 - 0.09 * k), angle: 0 }));
  const frameGap = (w) => Math.max(2.5, w * 0.024);
  const dilated = (ctx, o, gap) => {
    for (let a = 0; a < 8; a++) dombra(ctx, Object.assign({}, o, { cx: o.cx + gap * Math.cos((a * Math.PI) / 4), cy: o.cy + gap * Math.sin((a * Math.PI) / 4) }));
  };

  function drawPic(ctx, cx, cy, w) {
    dombra(ctx, picOpts(cx, cy, w));
  }

  // the D string's first 1.2 s, as its envelope column by column (the picture of state 4, small)
  let waveCache = null;
  function drawWave(ctx, cx, cy, w) {
    const snd = Deck.sound, cols = 48;
    if (!waveCache) waveCache = snd.wave(snd.string('D3'), cols, { to: Math.floor(1.2 * snd.SR) });
    const wv = waveCache, h = w * 0.82;
    let peak = 0;
    for (let c = 0; c < cols; c++) peak = Math.max(peak, wv.max[c], -wv.min[c]);
    const cw = w / cols;
    for (let c = 0; c < cols; c++) {
      const top = cy - (wv.max[c] / peak) * (h / 2), bot = cy - (wv.min[c] / peak) * (h / 2);
      ctx.fillRect(cx - w / 2 + c * cw, top, cw * 0.62, Math.max(bot - top, 2));
    }
  }

  // the frames back to front, each nearer one cut out of the ones behind with a paper margin
  function drawFrames(ctx, cx, cy, w) {
    const fr = frameOpts(cx, cy, w);
    for (let k = 2; k >= 0; k--) {
      ctx.globalCompositeOperation = 'destination-out';
      dilated(ctx, fr[k], frameGap(w));
      ctx.globalCompositeOperation = 'source-over';
      dombra(ctx, fr[k]);
    }
  }

  // The strings, one accent line per instrument from the bridge to the nut (the two strings are
  // closer than a dot at this size). A frame's string hides behind the frames in front of it.
  function strings(picAt, framesAt, w) {
    const out = [];
    const line = (o, hidden) => {
      const th = (o.angle * Math.PI) / 180, a = -0.425 * o.length, b = 0.385 * o.length, n = Math.round((b - a) / 3.3) + 1;
      for (let q = 0; q < n; q++) {
        const u = a + ((b - a) * q) / (n - 1), x = o.cx + u * Math.cos(th), y = o.cy + u * Math.sin(th);
        if (!hidden || !hidden(x, y)) out.push({ x, y, r: 1.3, c: Deck.A });
      }
    };
    line(picOpts(picAt[0], picAt[1], w));
    const fr = frameOpts(framesAt[0], framesAt[1], w), cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = ctx.strokeStyle = '#000';
    fr.forEach((o, k) => {
      if (k === 0) line(o);
      else {
        const img = ctx.getImageData(0, 0, W, H).data;
        line(o, (x, y) => img[(Math.round(y) * W + Math.round(x)) * 4 + 3] > 60);
      }
      dilated(ctx, o, frameGap(w));
    });
    return out;
  }

  // ink dots that sit on a string make room for it
  function withStrings(ink, str) {
    const keep = ink.filter((p) => !str.some((q) => Math.abs(q.x - p.x) < 2.8 && Math.abs(q.y - p.y) < 2.8 && Math.hypot(q.x - p.x, q.y - p.y) < 2.8));
    return keep.concat(str);
  }

  const DRAW = [drawWord, drawPic, drawWave, drawFrames];

  // ---- the ground: pin dots on a 45° screen inside a shape, clear of the figures ----

  function ground(inside, count, avoid, clearOf, rad) {
    const cell = 8, hash = new Map();
    for (const p of avoid) {
      const key = Math.floor(p.x / cell) + ',' + Math.floor(p.y / cell);
      if (!hash.has(key)) hash.set(key, []);
      hash.get(key).push(p);
    }
    const near = (x, y, d) => {
      const gx = Math.floor(x / cell), gy = Math.floor(y / cell), reach = Math.ceil(d / cell);
      for (let a = -reach; a <= reach; a++)
        for (let b = -reach; b <= reach; b++) {
          const list = hash.get(gx + a + ',' + (gy + b));
          if (list) for (const q of list) if (Math.hypot(q.x - x, q.y - y) < d) return true;
        }
      return false;
    };
    const blocked = (x, y) => clearOf.some((b) => Math.hypot((x - b.cx) / b.rx, (y - b.cy) / b.ry) < 1);
    const at = (pitch) => {
      const out = [], c = Math.SQRT1_2, reach = Math.ceil(Math.hypot(W, H) / 2 / pitch) + 1;
      for (let j = -reach; j <= reach; j++)
        for (let i = -reach; i <= reach; i++) {
          const x = W / 2 + (i - j) * c * pitch, y = H / 2 + (i + j) * c * pitch;
          const d = inside(x, y); // 0 at the centre .. 1 at the shore, or > 1 outside
          if (d > 1 || blocked(x, y) || near(x, y, Math.max(6.5, pitch * 0.75))) continue;
          out.push({ x, y, d, r: Math.max(Deck.R_MIN, rad[0] + (rad[1] - rad[0]) * d), c: Deck.K });
        }
      return out;
    };
    let lo = 3, hi = 40;
    for (let k = 0; k < 18; k++) {
      const mid = (lo + hi) / 2;
      if (at(mid).length >= count) lo = mid;
      else hi = mid;
    }
    return at(lo).sort((a, b) => a.d - b.d).slice(0, count); // the shore loses the surplus
  }

  // which of `centres` a point is closest to
  const nearest = (p, centres) => {
    let best = 0, bd = Infinity;
    centres.forEach(([x, y], k) => {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = k; }
    });
    return best;
  };

  // Group-to-group assignment: source group g keeps an even share of its dots (in left-to-right
  // order) for target group g; whatever is left on either side meets in one left-to-right pool.
  function assign(src, srcGroup, dst, dstGroup, groups) {
    const out = new Array(src.length), poolS = [], poolD = [];
    for (const g of groups) {
      const a = [], b = [];
      src.forEach((p, i) => { if (srcGroup[i] === g) a.push(i); });
      dst.forEach((p, i) => { if (dstGroup[i] === g) b.push(i); });
      a.sort((i, j) => src[i].x - src[j].x || src[i].y - src[j].y);
      b.sort((i, j) => dst[i].x - dst[j].x || dst[i].y - dst[j].y);
      const n = Math.min(a.length, b.length), useA = new Set(), useB = new Set();
      for (let q = 0; q < n; q++) {
        const ia = a[Math.floor(((q + 0.5) * a.length) / n)], ib = b[Math.floor(((q + 0.5) * b.length) / n)];
        out[ia] = dst[ib];
        useA.add(ia);
        useB.add(ib);
      }
      a.forEach((i) => { if (!useA.has(i)) poolS.push(i); });
      b.forEach((i) => { if (!useB.has(i)) poolD.push(i); });
    }
    src.forEach((p, i) => { if (srcGroup[i] == null) poolS.push(i); });
    dst.forEach((p, i) => { if (dstGroup[i] == null) poolD.push(i); });
    poolS.sort((i, j) => src[i].x - src[j].x);
    poolD.sort((i, j) => dst[i].x - dst[j].x);
    poolS.forEach((i, q) => (out[i] = dst[poolD[q]]));
    return out;
  }

  Deck.state(6, {
    setup() {
      // ---- beat 0: the pipeline ----
      const forms0 = Array.from(Deck.pts.mask((ctx) => drawWord(ctx, isleX(0), ROW, FORM0.w), { count: FORM0.word, fill: 0.5 })).concat(withStrings(
        Array.from(Deck.pts.mask((ctx) => [1, 2, 3].forEach((j) => DRAW[j](ctx, isleX(j), ROW, FORM0.w)), { count: FORM0.count, fill: 0.46 })),
        strings([isleX(1), ROW], [isleX(3), ROW], FORM0.w)));
      const pipes = [];
      for (let k = 0; k < 3; k++) {
        const x0 = isleX(k) + RD + 10, x1 = isleX(k + 1) - RD - 10, n = Math.round((x1 - x0) / 4.2) + 1;
        for (const dy of [-5, 5]) pipes.push(...Deck.pts.line(x0, ROW + dy, x1, ROW + dy, n, { r: 1.5 }));
      }
      const isles = ground((x, y) => {
        let d = Infinity;
        for (let k = 0; k < 4; k++) d = Math.min(d, Math.hypot(x - isleX(k), y - ROW) / RD);
        return d;
      }, Math.min(ISLES, N - forms0.length - pipes.length), forms0, [], ISLE_R);
      const centres0 = KINDS.map((k, j) => [isleX(j), ROW]);
      const formSet0 = new Set(forms0);
      const pipeline = Deck.pts.sortX([].concat(forms0, pipes, isles), 6).concat(Deck.pts.reserve(N - forms0.length - pipes.length - isles.length));
      const group0 = pipeline.map((p) => (formSet0.has(p) ? nearest(p, centres0) : null));

      // ---- beat 1: one space ----
      const words1 = Array.from(Deck.pts.mask((ctx) => {
        drawWord(ctx, HOME[0][0], HOME[0][1], FORM1.word);
        drawWord(ctx, NEAR.x, NEAR.y, FORM1.word, NEAR.text);
        drawWord(ctx, FAR.x, FAR.y, FORM1.word, FAR.text);
      }, { count: FORM1.words, fill: 0.5 }));
      const forms1 = words1.concat(withStrings(Array.from(Deck.pts.mask((ctx) => {
        [1, 2, 3].forEach((j) => DRAW[j](ctx, HOME[j][0], HOME[j][1], FORM1.w));
      }, { count: FORM1.count, fill: 0.46 })), strings(HOME[1], HOME[3], FORM1.w)));
      const sp = SPACE.p, sea = ground((x, y) => Math.pow(Math.pow(Math.abs(x - SPACE.cx) / SPACE.rx, sp) + Math.pow(Math.abs(y - SPACE.cy) / SPACE.ry, sp), 1 / sp), N - forms1.length, forms1, [], GROUND_R);
      const space = [].concat(forms1, sea);
      const centres1 = HOME.concat([[NEAR.x, NEAR.y], [FAR.x, FAR.y]]);
      const formSet1 = new Set(forms1);
      const group1 = space.map((p) => {
        if (!formSet1.has(p)) return null;
        const k = nearest(p, centres1);
        return k < 4 ? k : null;
      });
      const spaceL = assign(pipeline, group0, space, group1, [0, 1, 2, 3]);

      return { pipeline, spaceL, rowBottom: ROW + RD };
    },

    beats: [
      {
        layout: (s) => Deck.layout(s.pipeline),
        caption: (s) => ({
          headline: HEAD,
          labels: [{ text: 'у каждой своя модель', x: W / 2, y: s.rowBottom + 28, align: 'center' }],
          tag: 'schema',
        }),
        move: { ms: 1300, stagger: 'x', spread: 0.5, curl: 0.12 },
      },
      {
        layout: (s) => Deck.layout(s.spaceL),
        caption: {
          headline: HEAD,
          tag: 'schema',
          src: { text: 'CLIP, 2021 · ImageBind, 2023 · Chameleon, 2024', v: 'V-12 V-13 V-14' },
        },
        move: { ms: 1300, stagger: 'x', spread: 0.4, curl: 0.1 },
      },
    ],
  });
})();
