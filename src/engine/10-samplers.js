// Point samplers: everything a state needs to say where the 4096 dots go.
// A point is a plain object { x, y, r, c } in stage units (r radius, c ink id: Deck.K or Deck.A)
// plus optional tags a sampler adds (g glyph, tok token, col, row, part, s, u).
// The ORDER of points is the identity of dots: point i of a layout is dot i.
(function () {
  'use strict';
  const Deck = window.Deck;
  const { W, H, N } = Deck;
  const pts = (Deck.pts = {});

  // ---- helpers ---------------------------------------------------------------------------

  // Left-to-right order (column bands, top to bottom inside a band). This is the default
  // identity order: a state entered from any neighbour then flows left to left, right to right.
  pts.sortX = function (points, band) {
    const b = band || 6;
    return points.sort((p, q) => Math.floor(p.x / b) - Math.floor(q.x / b) || p.y - q.y);
  };

  pts.bounds = function (points) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of points) {
      if (p.x < x0) x0 = p.x;
      if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.y > y1) y1 = p.y;
    }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };

  // Set ink and/or radius on a list of points, in place. Returns the list.
  pts.paint = function (points, c, r) {
    for (const p of points) {
      if (c != null) p.c = c;
      if (r != null) p.r = r;
    }
    return points;
  };

  // ---- mask to points (the halftone screen) -------------------------------------------------

  // Offscreen stage-sized canvas -> integral image of alpha.
  function integral(draw) {
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#000';
    if (typeof draw === 'function') draw(ctx);
    else ctx.drawImage(draw, 0, 0, W, H); // a canvas or an image: its alpha is the tone
    const a = ctx.getImageData(0, 0, W, H).data;
    const I = new Float64Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) {
      let row = 0;
      for (let x = 0; x < W; x++) {
        row += a[(y * W + x) * 4 + 3];
        I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row;
      }
    }
    return I;
  }

  // Mean alpha (0..1) in the box of half-size h around (x, y).
  function coverage(I, x, y, h) {
    let x0 = Math.round(x - h), x1 = Math.round(x + h), y0 = Math.round(y - h), y1 = Math.round(y + h);
    const area = (x1 - x0) * (y1 - y0);
    if (area <= 0) return 0;
    x0 = Deck.clamp(x0, 0, W); x1 = Deck.clamp(x1, 0, W);
    y0 = Deck.clamp(y0, 0, H); y1 = Deck.clamp(y1, 0, H);
    const s = I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0];
    return s / (255 * area);
  }

  function screen(I, pitch, angleDeg, min) {
    const th = (angleDeg * Math.PI) / 180, cs = Math.cos(th), sn = Math.sin(th);
    const cx = W / 2, cy = H / 2, reach = Math.ceil(Math.hypot(W, H) / 2 / pitch) + 1;
    const out = [];
    for (let j = -reach; j <= reach; j++) {
      for (let i = -reach; i <= reach; i++) {
        const x = cx + (i * cs - j * sn) * pitch, y = cy + (i * sn + j * cs) * pitch;
        if (x < 0 || x > W || y < 0 || y > H) continue;
        const t = coverage(I, x, y, pitch / 2);
        if (t >= min) out.push({ x, y, t });
      }
    }
    return out;
  }

  // Deck.pts.mask(draw, opts) -> points on the halftone screen wherever `draw` put ink.
  //   draw   function (ctx) that fills shapes in stage coordinates (alpha = tone), or a canvas/image
  //   opts   { count, pitch = 6, angle = 45, fill = 0.385, min = 0.3, c = Deck.K }
  //          count: exact number of points; the pitch is then searched and the weakest edge dots dropped
  // A dot's radius is pitch * fill * sqrt(tone): tone is carried by dot size, never by opacity.
  pts.mask = function (draw, opts) {
    const o = Object.assign({ pitch: 6, angle: 45, fill: 0.385, min: 0.3, c: Deck.K }, opts);
    const I = integral(draw);
    let pitch = o.pitch, raw;
    if (o.count) {
      let lo = 2, hi = 48; // largest pitch that still yields at least `count` points
      for (let k = 0; k < 22; k++) {
        const mid = (lo + hi) / 2;
        if (screen(I, mid, o.angle, o.min).length >= o.count) lo = mid;
        else hi = mid;
      }
      pitch = lo;
      raw = screen(I, pitch, o.angle, o.min);
      if (raw.length > o.count) {
        raw.sort((a, b) => b.t - a.t);
        raw.length = o.count;
      }
    } else {
      raw = screen(I, pitch, o.angle, o.min);
    }
    const rmax = pitch * o.fill;
    const out = raw.map((p) => ({ x: p.x, y: p.y, r: Math.max(Deck.R_MIN, rmax * Math.sqrt(p.t)), c: o.c, t: p.t }));
    pts.sortX(out, pitch);
    out.pitch = pitch;
    return out;
  };

  // Deck.pts.text(str, opts) -> points that fill the glyphs of `str`.
  //   opts { x, y (baseline), size, fit (width in px; overrides size), align = 'left',
  //          weight = 900, font = Deck.FONT_DOTS, tracking = 0 (em), + every Deck.pts.mask option }
  // Each point carries g = index of the character it belongs to. The result has .size and .box.
  pts.text = function (str, opts) {
    const o = Object.assign({ x: Deck.MARGIN, y: H / 2, size: 200, align: 'left', weight: 900, font: Deck.FONT_DOTS, tracking: 0 }, opts);
    const probe = document.createElement('canvas').getContext('2d');
    const setFont = (ctx, size) => {
      ctx.font = `${o.weight} ${size}px "${o.font}"`;
      ctx.letterSpacing = `${o.tracking * size}px`;
      ctx.textBaseline = 'alphabetic';
    };
    let size = o.size;
    if (o.fit) {
      setFont(probe, 200);
      const m = probe.measureText(str);
      size = (200 * o.fit) / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
    }
    setFont(probe, size);
    const m = probe.measureText(str);
    const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    // x is the left edge of the ink for 'left', the centre for 'center', the right edge for 'right'
    let x = o.x + m.actualBoundingBoxLeft;
    if (o.align === 'center') x -= inkW / 2;
    if (o.align === 'right') x -= inkW;
    const out = pts.mask((ctx) => {
      setFont(ctx, size);
      ctx.fillText(str, x, o.y);
    }, o);
    const edges = [];
    for (let i = 1; i <= str.length; i++) edges.push(x + probe.measureText(str.slice(0, i)).width);
    for (const p of out) {
      let g = 0;
      while (g < edges.length - 1 && p.x > edges[g]) g++;
      p.g = g;
    }
    out.size = size;
    out.box = { x0: x - m.actualBoundingBoxLeft, x1: x + m.actualBoundingBoxRight, y0: o.y - m.actualBoundingBoxAscent, y1: o.y + m.actualBoundingBoxDescent };
    return out;
  };

  // Deck.pts.path(d, opts) -> points that fill (or stroke) an SVG path or a Path2D.
  //   opts { x = 0, y = 0, scale = 1, stroke (line width; fills when absent), + Deck.pts.mask options }
  pts.path = function (d, opts) {
    const o = Object.assign({ x: 0, y: 0, scale: 1 }, opts);
    const p = typeof d === 'string' ? new Path2D(d) : d;
    return pts.mask((ctx) => {
      ctx.translate(o.x, o.y);
      ctx.scale(o.scale, o.scale);
      if (o.stroke) {
        ctx.lineWidth = o.stroke;
        ctx.lineCap = ctx.lineJoin = 'round';
        ctx.stroke(p);
      } else ctx.fill(p);
    }, o);
  };

  // ---- straight screens -------------------------------------------------------------------------

  // Deck.pts.grid({ x, y, cols, rows, dx, dy = dx, r, c, order = 'cols' }) -> cols * rows points.
  // (x, y) is the centre of the top-left dot. Points carry col and row.
  pts.grid = function (opts) {
    const o = Object.assign({ x: 0, y: 0, cols: 64, rows: 64, dx: 8, r: 2, c: Deck.K, order: 'cols' }, opts);
    const dy = o.dy == null ? o.dx : o.dy, out = [];
    const put = (col, row) => out.push({ x: o.x + col * o.dx, y: o.y + row * dy, r: o.r, c: o.c, col, row });
    if (o.order === 'rows') for (let row = 0; row < o.rows; row++) for (let col = 0; col < o.cols; col++) put(col, row);
    else for (let col = 0; col < o.cols; col++) for (let row = 0; row < o.rows; row++) put(col, row);
    return out;
  };

  // Deck.pts.along(poly, n, { r, c }) -> n points evenly spaced along a polyline [[x, y], ...].
  // Points carry u = 0..1 along the line.
  pts.along = function (poly, n, opts) {
    const o = Object.assign({ r: 1.6, c: Deck.K }, opts);
    const seg = [0];
    for (let i = 1; i < poly.length; i++) seg.push(seg[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
    const total = seg[seg.length - 1], out = [];
    let k = 1;
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1), d = u * total;
      while (k < seg.length - 1 && seg[k] < d) k++;
      const f = seg[k] === seg[k - 1] ? 0 : (d - seg[k - 1]) / (seg[k] - seg[k - 1]);
      out.push({ x: Deck.lerp(poly[k - 1][0], poly[k][0], f), y: Deck.lerp(poly[k - 1][1], poly[k][1], f), r: o.r, c: o.c, u });
    }
    return out;
  };

  pts.line = (x1, y1, x2, y2, n, opts) => pts.along([[x1, y1], [x2, y2]], n, opts);

  // ---- the token strip ----------------------------------------------------------------------------

  // One fixed row along the lower third: 64 tokens, 64 dots each (4 columns x 16 rows).
  // States 2-5 end on it, state 6 merges four of them. Do not restyle it.
  const S = (Deck.STRIP = { tokens: 64, per: 64, cols: 4, rows: 16, pitch: 3.6, r: 1.3, x: Deck.MARGIN, y: 540, w: W - 2 * Deck.MARGIN });
  S.period = (S.w - (S.cols - 1) * S.pitch) / (S.tokens - 1); // token to token, about 18.1 px
  S.h = (S.rows - 1) * S.pitch; // 54 px from the top row to the bottom row
  S.cy = S.y + S.h / 2;

  // Deck.pts.strip({ from = 0, tokens = 64, c, y }) -> 64 points per token, token by token, left to right.
  // Points carry tok (0..63), col (0..3), row (0..15). `c` may be an ink id or a function (tok) -> ink id.
  pts.strip = function (opts) {
    const o = Object.assign({ from: 0, tokens: S.tokens, c: Deck.K, y: S.y }, opts);
    const out = [];
    for (let tok = o.from; tok < o.from + o.tokens && tok < S.tokens; tok++) {
      const c = typeof o.c === 'function' ? o.c(tok) : o.c;
      for (let col = 0; col < S.cols; col++)
        for (let row = 0; row < S.rows; row++)
          out.push({ x: S.x + tok * S.period + col * S.pitch, y: o.y + row * S.pitch, r: S.r, c, tok, col, row });
    }
    return out;
  };

  // Where token `tok` sits: { x0, x1, cx, y0, y1, cy } (for a label above one token).
  pts.stripToken = function (tok) {
    const x0 = S.x + tok * S.period, x1 = x0 + (S.cols - 1) * S.pitch;
    return { x0, x1, cx: (x0 + x1) / 2, y0: S.y, y1: S.y + S.h, cy: S.cy };
  };

  // ---- the reserve --------------------------------------------------------------------------------

  // Deck.pts.reserve(k) -> k parked dots: a fine dotted rule along the top edge, filled from the left.
  // Deck.layout() parks unused dots here by itself. Keep it under about 800 dots (two rows);
  // when more are left over, enlarge the form or park them in the strip instead.
  pts.reserve = function (k) {
    const pitch = 3, perRow = Math.floor((W - 2 * Deck.MARGIN) / pitch) + 1, out = [];
    for (let i = 0; i < k; i++) {
      const row = i % 2, col = Math.floor(i / 2) % perRow, deep = Math.floor(i / 2 / perRow);
      out.push({ x: Deck.MARGIN + col * pitch, y: 20 + (row + deep * 2) * pitch, r: 0.9, c: Deck.K });
    }
    return out;
  };

  // The placeholder for a state nobody has registered yet: the dots form its number.
  pts.number = function (n) {
    return pts.text(String(n), { x: W / 2, y: 520, size: 460, align: 'center', count: N });
  };

  // ---- layout ---------------------------------------------------------------------------------------

  // Deck.layout(points[, more points...]) -> the arrangement of all 4096 dots for one beat.
  // Concatenates its arguments in order. Fewer than 4096 points: the rest are parked in the reserve.
  // More than 4096: an error is logged and the tail is cut. Returns { x, y, r, c } typed arrays.
  Deck.layout = function () {
    let all = [];
    for (const part of arguments) if (part && part.length) all = all.concat(Array.from(part));
    if (all.length > N) {
      console.error(`[deck] layout has ${all.length} points, ${all.length - N} too many; the tail is cut`);
      all.length = N;
    }
    if (all.length < N) all = all.concat(pts.reserve(N - all.length));
    const L = { x: new Float32Array(N), y: new Float32Array(N), r: new Float32Array(N), c: new Uint8Array(N) };
    for (let i = 0; i < N; i++) {
      const p = all[i];
      L.x[i] = p.x;
      L.y[i] = p.y;
      L.r[i] = Math.max(Deck.R_MIN, p.r == null ? Deck.R_FORM : p.r);
      L.c[i] = p.c ? 1 : 0;
    }
    return L;
  };
})();
