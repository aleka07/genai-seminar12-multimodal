// State 3 (А). «Картинка — тоже токены».
// Beat 0: a photograph of the dombra, cropped in: the pear body with its sound hole and bridge
//         fills the lower left of a straight 56 x 56 screen, the neck runs out at the top right
//         corner, the two strings in the accent ink (the background a light even tone, so the
//         square itself is visible).
// Beat 1: a 14 x 14 grid cuts it into 196 patches of 4 x 4 dots; the patches step apart, so the
//         grid is the gaps, never a drawn line.
// Beat 2: the patches, in reading order, become 196 thin tiles in the strip band (one column of
//         16 dots per patch, each dot keeping its tone and ink): the picture unrolled into a row.
// 56 x 56 = 3136 dots; the other 960 rest in a tidy three-row rule along the top edge.
(function () {
  'use strict';
  const Deck = window.Deck, { W, N } = Deck, S = Deck.STRIP;

  // The one number of this state, fixed in spec.md: V-03, ViT (2020), 224 px image, 16 px patch.
  const A2 = { value: '196', unit: 'патчей из одной картинки', src: 'ViT, 2020: 224 px, патч 16 px', v: 'V-03' };

  const HEADLINE = 'Картинка — тоже токены';
  const P = 14, D = 4, CELLS = P * D; // 14 x 14 patches, 4 x 4 dots each
  const PITCH = 8, GAP = 5, SIDE = CELLS * PITCH; // a 448 px square; 513 px once cut
  const OUT = SIDE + (P - 1) * GAP;
  const CX = W / 2, CY = 386; // centred, as tall as the stage allows between headline and bottom line
  const BG = 0.13, FILL = 0.43; // background tone; dot radius at full tone as a share of the pitch
  const R_BG = 1.0, R_TILE = 1.9; // background and darkest dot in the row

  // The picture, in screen cells (0..56, y down), as tone 0..1 per point. The instrument lies at
  // -45 degrees: u runs along it from the tail, v across. At this angle a line of cells x + y = k
  // is exactly one diagonal of the screen, so the strings (v = +-1/sqrt 2) fall on cell centres.
  const PIC = {
    ox: 4.3, oy: 52.7, // the tail; ox + oy is a whole number, see above
    B: 58, Wb: 20, tm: 0.37, // body length, body half-width, widest point as a share of B
    wn: 2.6, // neck half-width
    rim: 1.8, board: 0.32, channel: 0.1, // dark rim, soundboard, pale channel under the strings
    neck: 0.5, neckRim: 1.0, frets: [66, 72, 78, 84],
    hole: { u: 0.6, r: 3.4 }, bridge: { u: 0.22, w: 5.5 }, sv: Math.SQRT1_2,
  };
  const ax = Math.SQRT1_2, ay = -Math.SQRT1_2, nx = -ay, ny = ax;
  function halfWidth(u) {
    const { B, Wb, tm, wn } = PIC;
    if (u < 0) return -1;
    if (u > B) return wn;
    const t = u / B;
    if (t <= tm) {
      const q = (tm - t) / tm;
      return Wb * Math.sqrt(Math.max(0, 1 - q * q)); // round tail
    }
    const q = (t - tm) / (1 - tm);
    return wn + (Wb - wn) * (0.5 + 0.5 * Math.cos(Math.PI * Math.pow(q, 0.82))); // shoulder into the neck
  }
  function toneAt(x, y) {
    const dx = x - PIC.ox, dy = y - PIC.oy, u = dx * ax + dy * ay, v = dx * nx + dy * ny;
    const h = halfWidth(u), d = h - Math.abs(v);
    if (d <= 0) return 0;
    const bu = PIC.bridge.u * PIC.B, hu = PIC.hole.u * PIC.B;
    if (Math.hypot(u - hu, v) < PIC.hole.r) return 1; // sound hole
    if (u > PIC.B) {
      if (PIC.frets.some((f) => Math.abs(u - f) < 0.5)) return 1;
      return d < PIC.neckRim ? 1 : PIC.neck;
    }
    if (d < PIC.rim) return 1;
    if (Math.abs(u - bu) < 0.6 && Math.abs(v) < PIC.bridge.w) return 1; // bridge
    if (u > bu + 0.6 && Math.abs(v) < PIC.sv + 0.9) return PIC.channel;
    return PIC.board;
  }
  // mean tone of one cell, 8 x 8 samples: edge cells print smaller, like a real halftone
  function cellTone(gx, gy) {
    let s = 0;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) s += toneAt(gx + (j + 0.5) / 8, gy + (i + 0.5) / 8);
    return s / 64;
  }
  // the cells each string passes through, from the bridge out of the frame
  function stringCells() {
    const on = new Set(), bu = PIC.bridge.u * PIC.B;
    for (const sv of [-PIC.sv, PIC.sv])
      for (let u = bu; u < 140; u += 0.2) {
        const x = PIC.ox + u * ax + sv * nx, y = PIC.oy + u * ay + sv * ny;
        const gx = Math.floor(x + 1e-6), gy = Math.floor(y + 1e-6);
        if (gx >= 0 && gx < CELLS && gy >= 0 && gy < CELLS) on.add(gy * CELLS + gx);
      }
    return on;
  }

  Deck.state(3, {
    setup() {
      const x0 = CX - SIDE / 2, y0 = CY - SIDE / 2;
      const strings = stringCells();

      // Patch raster order (row of patches, patch, row inside, column inside): that is the order of
      // the strip in beat 2, so the same index order serves all three beats.
      const img = [], cut = [], row = [];
      const rmax = PITCH * FILL, rbg = rmax * Math.sqrt(BG);
      const period = S.w / (P * P - 1);
      for (let pr = 0; pr < P; pr++)
        for (let pc = 0; pc < P; pc++)
          for (let dr = 0; dr < D; dr++)
            for (let dc = 0; dc < D; dc++) {
              const gx = pc * D + dc, gy = pr * D + dr;
              const x = x0 + (gx + 0.5) * PITCH, y = y0 + (gy + 0.5) * PITCH;
              const acc = strings.has(gy * CELLS + gx), c = acc ? Deck.A : Deck.K;
              const r = rmax * Math.sqrt(acc ? 0.92 : BG + (1 - BG) * cellTone(gx, gy));
              img.push({ x, y, r, c });
              cut.push({ x: x + (pc - (P - 1) / 2) * GAP, y: y + (pr - (P - 1) / 2) * GAP, r, c });
              const k = pr * P + pc; // the patch's place in the row
              row.push({ x: S.x + k * period, y: S.y + (dr * D + dc) * S.pitch, r: R_BG + ((R_TILE - R_BG) * (r - rbg)) / (rmax - rbg), c });
            }

      // The rest rest in three full rows along the top edge, left to right.
      const spare = N - img.length, perRow = spare / 3, park = [];
      for (let i = 0; i < perRow; i++)
        for (let j = 0; j < 3; j++) park.push({ x: Deck.MARGIN + (i * S.w) / (perRow - 1), y: 16 + j * 3.6, r: 0.9, c: Deck.K });

      // Interleave the parked dots by rank, so every index range is the same share of stage width
      // in every beat: neighbours that sort by x (states 2 and 4) then flow straight up and down.
      const order = [];
      for (let i = 0, j = 0; i + j < N; ) {
        if (j >= park.length || (i < img.length && (i + 0.5) / img.length <= (j + 0.5) / park.length)) order.push([0, i++]);
        else order.push([1, j++]);
      }
      const pick = (list) => order.map(([w, k]) => (w ? park[k] : list[k]));

      // beside the cut picture, at mid-height
      const label = { text: 'каждый патч — токен', x: CX + OUT / 2 + 32, y: CY - 16 };
      return { img: pick(img), cut: pick(cut), row: pick(row), label };
    },

    beats: [
      {
        layout: (s) => Deck.layout(s.img),
        caption: { headline: HEADLINE, tag: 'live' },
        move: { ms: 1300, stagger: 'x', spread: 0.45, curl: 0.12 },
      },
      {
        layout: (s) => Deck.layout(s.cut),
        caption: (s) => ({ headline: HEADLINE, labels: [s.label], tag: 'live' }),
        // the cut opens from the centre outwards
        move: { ms: 1000, stagger: 'radial', origin: [CX, CY], spread: 0.35, curl: 0.02 },
      },
      {
        layout: (s) => Deck.layout(s.row),
        caption: {
          headline: HEADLINE,
          figure: { value: A2.value, unit: A2.unit },
          tag: 'live',
          src: { text: A2.src, v: A2.v },
        },
        // patch by patch in reading order: the top row of the picture leaves first
        move: { ms: 1400, stagger: 'index', spread: 0.6, curl: 0.05 },
      },
    ],
  });
})();
