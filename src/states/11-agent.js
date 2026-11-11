// State 11 (Б). «Увидеть и сделать». Action is one more output modality.
// Beat 0: the model sees the dombra, cut into patches. Beat 1: five action tokens come out of the
// picture. Beat 2: the patches close into the real dombra and the tokens condense into one bold
// accent mark that pulls the upper string and lets go; it rings and sounds. Beat 3: everything lines
// up as the token strip with the number; the first 13 of 64 tokens are accent (13 / 64 = 20.3 %), so
// the strip is the picture of the number, and the mark's dots land in the last five of those 13.
// The number is about agents that work a computer (OSWorld), not about this pluck, and the caption
// says so.
(function () {
  'use strict';
  const Deck = window.Deck, { W, N } = Deck, M = Deck.MARGIN;

  // The one number of this state, fixed in spec.md ("On-screen facts, fixed"): V-20, OSWorld 2.0,
  // binary completion at 500 steps, best reported model.
  const D12 = {
    value: '20,6 %',
    unit: 'задач за компьютером до конца',
    src: 'OSWorld 2.0, 2026: Claude Opus 4.8',
    v: 'V-20',
  };

  const DOM = { cx: 640, cy: 380, length: 1120 };
  const PATCH = { size: 40, shrink: 0.76 }; // patch content shrinks to its centre, opening gaps
  const TOK = { n: 5, side: 8, pitch: 6, gap: 18, top: 528, r: 2.3 }; // action tokens, 64 dots each
  const T = TOK.n * TOK.side * TOK.side; // 320 dots: the tokens, then the mark, then the tokens again
  const PL = { touch: 0.2, pull: 0.42, lift: 0.75, rest: 12, amp: 20 }; // the pluck, in seconds and px
  const FIG_X = 600; // right edge of the figure «20,6 %» on the strip beat
  const MARK = { R: 20, r: 1.45, gap: 3 }; // the action mark: outer radius, dot radius, clearance over the string

  Deck.state(11, {
    setup() {
      const full = Deck.pts.dombra(Object.assign({ count: N }, DOM));
      const small = Deck.pts.dombra(Object.assign({ count: N - T }, DOM));
      const str = small.strings[0], xp = (str.x0 + str.x1) / 2, ys = (str.y0 + str.y1) / 2; // the plucked point

      // patches: every dot pulls towards the centre of its 40 px cell; the neck runs along a row centre
      const x0 = DOM.cx - DOM.length / 2;
      const patch = (p) => {
        const px = x0 + (Math.floor((p.x - x0) / PATCH.size) + 0.5) * PATCH.size;
        const py = DOM.cy + Math.round((p.y - DOM.cy) / PATCH.size) * PATCH.size;
        return Object.assign({}, p, { x: px + (p.x - px) * PATCH.shrink, y: py + (p.y - py) * PATCH.shrink, r: Math.max(Deck.R_MIN, p.r * 0.94) });
      };

      // which dots become the tokens: one dot in every thirteen of the picture, so they rise from all of it
      const isTok = new Uint8Array(N), tokIdx = [];
      for (let k = 0; k < T; k++) {
        const i = Math.floor(((k + 0.5) * N) / T);
        isTok[i] = 1;
        tokIdx.push(i);
      }

      // the action tokens: a short row under the plucked point, left to right
      const tw = (TOK.side - 1) * TOK.pitch, row = TOK.n * tw + (TOK.n - 1) * TOK.gap;
      const tx0 = xp - row / 2, tokens = [];
      for (let t = 0; t < TOK.n; t++)
        for (const p of Deck.pts.grid({ x: tx0 + t * (tw + TOK.gap), y: TOK.top, cols: TOK.side, rows: TOK.side, dx: TOK.pitch, r: TOK.r, c: Deck.A })) tokens.push(p);

      // the action: the five tokens condense into one bold accent mark just above the plucked point,
      // a plectrum reduced to a single dot (a fused sunflower cluster, far larger than any other dot)
      const markY = ys - MARK.gap - PL.rest - MARK.R; // the mark's centre at rest
      const mark = [];
      for (let j = 0; j < T; j++) {
        const rr = (MARK.R - MARK.r) * Math.sqrt((j + 0.5) / T), th = j * 2.399963;
        mark.push({ x: xp + rr * Math.cos(th), y: markY + rr * Math.sin(th), r: MARK.r, c: Deck.A });
      }
      Deck.pts.sortX(mark, 2);

      // ---- the four layouts, all indexed by dot ------------------------------------------------
      const seen = full.map(patch);
      const look = new Array(N), act = new Array(N);
      let next = 0, kk = 0;
      const stringIdx = [], stringT = [];
      for (let i = 0; i < N; i++) {
        if (isTok[i]) {
          look[i] = tokens[kk];
          act[i] = mark[kk++];
        } else {
          const p = small[next++];
          look[i] = patch(p);
          act[i] = p;
          if (p.part === 'string' && p.s === 0) { stringIdx.push(i); stringT.push(p.t); }
        }
      }

      // the strip: the first ACC tokens are accent, the share of the number; the mark's dots fill the
      // last five of them (the ones nearest the mark), the picture's dots fill all else in order
      const ACC = 13, first = ACC - TOK.n;
      const isMark = (tok) => tok >= first && tok < ACC;
      const strip = Deck.pts.strip({ c: (tok) => (tok < ACC ? Deck.A : Deck.K) });
      const actPts = strip.filter((p) => isMark(p.tok)), restPts = strip.filter((p) => !isMark(p.tok));
      const line = new Array(N);
      let a = 0, b = 0;
      for (let i = 0; i < N; i++) line[i] = isTok[i] ? actPts[a++] : restPts[b++];

      const ring = Deck.wobble({ idx: stringIdx, t: stringT, normal: [0, -1], amp: PL.amp, hz: 8, decay: 0.75 });
      return { seen, look, act, line, tokIdx, stringIdx, stringT, ring, xp, tokRight: tx0 + row, markY };
    },

    beats: [
      {
        layout: (s) => Deck.layout(s.seen),
        caption: () => ({
          headline: 'Увидеть и сделать',
          labels: [{ text: 'модель видит патчи', x: W - M, y: 190, align: 'right' }],
          tag: 'schema',
        }),
        move: { ms: 1300, stagger: 'x', spread: 0.45, curl: 0.12 },
      },
      {
        layout: (s) => Deck.layout(s.look),
        caption: (s) => ({
          headline: 'Увидеть и сделать',
          labels: [{ text: 'токены действия', x: s.tokRight + 28, y: TOK.top + 6 }],
          tag: 'schema',
        }),
        // the token dots leave the picture from everywhere and gather under the string
        move: { ms: 1300, stagger: (i, fx, fy, tx, ty) => Math.hypot(tx - fx, ty - fy), spread: 0.35, curl: 0.16 },
      },
      {
        layout: (s) => Deck.layout(s.act),
        caption: (s) => ({
          headline: 'Увидеть и сделать',
          labels: [{ text: 'действие', x: s.xp + MARK.R + 24, y: s.markY - MARK.R - 26 }],
          tag: 'schema',
        }),
        // patches close; the tokens condense into the mark
        move: { ms: 1200, stagger: 'x', spread: 0.3, curl: 0.1 },
        enter(s, info) {
          if (info.dir > 0) Deck.sound.play(Deck.sound.string('D3'), { delay: 1.2 + PL.pull });
        },
        // the mark comes down onto the string, pulls it up and lets go; the string rings
        live(t, frame, s) {
          const e = Deck.ease.inOut;
          let fy, pull = 0;
          if (t < PL.touch) fy = PL.rest * e(t / PL.touch);
          else if (t < PL.pull) {
            pull = PL.amp * e((t - PL.touch) / (PL.pull - PL.touch));
            fy = PL.rest - pull;
          } else fy = (PL.rest - PL.amp) * (1 - e(Deck.clamp((t - PL.pull) / (PL.lift - PL.pull), 0, 1)));
          for (const i of s.tokIdx) frame.y[i] += fy;
          if (t < PL.pull) {
            for (let k = 0; k < s.stringIdx.length; k++) frame.y[s.stringIdx[k]] -= pull * (1 - Math.abs(2 * s.stringT[k] - 1));
            return true;
          }
          return s.ring(t - PL.pull, frame) || t < PL.lift;
        },
        stillAt: 0.36, // the still frame: the mark has the string pulled up, at its apex
      },
      {
        layout: (s) => Deck.layout(s.line),
        caption: () => ({
          headline: 'Увидеть и сделать',
          figure: { value: D12.value, unit: D12.unit },
          tag: 'schema',
          src: { text: D12.src, v: D12.v },
        }),
        // the body, which sits where the figure goes, lands first and all at once (by ~0.4 of the
        // move, as the figure finishes fading in); then a front sweeps along the neck to the head
        move: { ms: 1300, stagger: (i, fx) => (fx < FIG_X ? 0 : 140 + fx - FIG_X), spread: 0.6, curl: -0.08 },
      },
    ],
  });
})();
