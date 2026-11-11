# DESIGN: seminar 12 deck «Мультимодальные генеративные системы»

One scene, 14 состояний, the same 4096 dots from the first second to the last. This file fixes the look and documents the engine for state authors. Read it together with `.scratch/seminar12-multimodal/spec.md`; you should not need to open `src/engine/`.

Verification status (2026-11-11): every state and beat was rendered in headless Chrome and reviewed; an automated walk checks all 14 states for page errors, external requests, the 4096-dot invariant, text sizes and a source line beside every number. A separate red-team review of content and look was applied afterwards.

## Direction: «Растр»

The deck is one halftone print that keeps re-screening itself: every picture is the same 4096 round dots on a screen, tone is carried by dot size alone, and a dot is a token. Forms (the word, the dombra silhouette) sit on a 45° screen like a newspaper photograph; data (patches, spectrogram, token strip) sits on a straight screen, so "a form becomes tokens" is literally the screen straightening. There are two inks on cool paper, near-black and process magenta, and the magenta belongs to one thing only: what sounds or answers (the strings, the note, the answer).

Why this and not the starting point as given. "Two-ink print on paper" stays, but as given it is a palette, and a palette alone would read as a re-skin. Three rules make it a system the builders can hold: (1) no grey and no opacity anywhere, type included, so hierarchy is size, weight and italic only; (2) 4096 = 64 × 64 is shown as such in the first frame (a square of noise) and returns as 64 tokens × 64 dots in the strip and 128 × 32 in the spectrogram; (3) the accent has a meaning instead of a job as decoration. The type is a book serif (Literata) instead of a grotesque, because every earlier deck in the course is set in Onest and because a fat serif survives the halftone with more character («домбра» in Literata Black reads as wood type).

Not like the earlier decks: light, not dark; no glow, no particles drifting; no blue, mint, orange, magma, petrol, yellow or violet; no panels, rails, maps or players.

## Palette

| Token | Hex | Use |
|---|---|---|
| paper | `#F1F0EC` | background, the letter inside the counter dot |
| ink | `#17161B` | dots and all text |
| accent | `#E4007C` | dots only: what sounds or answers. Never text, never a fill behind text |

Contrast (WCAG): ink on paper 15.8:1; paper on ink 15.8:1 (counter letter); accent on paper 4.0:1 and accent against ink 3.9:1, which is why the accent is for dots (graphics, 3:1 needed) and never for text (4.5:1 needed). The only non-text use of the accent outside the canvas is the keyboard focus ring of a control.

No other colour, no tints, no `opacity`, no `rgba`, no gradients, no shadows, no borders. The one exception: captions cross-fade during a transition (160 ms out, 520 ms in).

## Type

Literata (TypeTogether, OFL) for all text and for the glyph sampler; PT Mono (ParaType, OFL) for the counter and for token ids. Both are inlined as WOFF2 (latin, cyrillic, cyrillic-ext) and pass the Kazakh check (ә ғ қ ң ө ұ ү һ і, both cases): `node .scratch/seminar12-multimodal/tools/fontcheck.mjs`. Weights shipped: Literata 400, 400 italic, 600, 900 (900 is sampled into dots, do not set text in it); PT Mono 400.

The faces carry no arrows. Write `→ ← ↑ ↓` in caption text as usual; the caption layer draws them as one consistent arrow.

Scale on the 1280 × 720 stage (px):

| Role | Face | Size / line | Notes |
|---|---|---|---|
| headline | Literata 600 | 56 / 1.06, tracking -0.012em | sentence case, max width 800, balanced wrap |
| body | Literata 400 | 26 / 1.36 | max width 560 |
| figure | Literata 600 | 184, unit 34 | the state's one number on a strip beat; unit in Literata 400 on the same baseline |
| label | Literata 400 italic | 24 / 1.25 | minimum 22; `upright: true` for a non-italic label, `mono: true` for ids |
| control | Literata 400 | 22 / 1.2 | chosen item is ink-filled with paper text |
| honesty label | Literata 400 italic | 22 | bottom line |
| src | Literata 400 | 15 / 1.3 | bottom line |
| counter | PT Mono 400 | 15 | letter: Literata 600, 16, in a 30 px ink dot |

No capitals-only labels, no letter-spaced eyebrows, no bold inside a sentence.

## Dot spec

- 4096 dots, always on stage, round, flat, no outline. A dot has a position, a radius and one of two inks. Minimum radius 0.7 (`Deck.R_MIN`): the quietest tone is a pin dot, never an absent one.
- Tone is size: radius = pitch × fill × √tone. Edge dots of a form shrink with coverage, which is what makes an outline look printed instead of pixelated.
- Form screen: 45°, pitch about 6 (searched so the form takes exactly the dots you give it), fill 0.385, so a full dot has radius 2.3 and diameter 4.6. On a 1920-wide projector that is a 7 px dot on a 9 px screen: a visible halftone from the back row, not dust.
- Straight screens: the noise square 64 × 64 at pitch 7 (radius 0.75 to 3.3); the spectrogram 128 × 32 at pitch 9 (radius up to 4.1); the waveform at pitch 5 (radius 1.9).
- The dombra has its own straight screen along its axis (pitch = length / 232, about 4.8 at length 1120; fill 0.43). A string is one row of that screen in the accent ink.
- Token strip: 64 tokens × 64 dots (4 columns × 16 rows, pitch 3.6, radius 1.3), from x 64 to 1216, y 540 to 594. The dots are deliberately too fine to count: a token reads as a tile.
- Reserve: unused dots park as a fine dotted rule along the top edge (pitch 3, radius 0.9, from x 64, y 20). Keep it under about 800 dots; with more left over, enlarge the form.
- Inks do not blend. A dot that changes ink does it at the middle of its flight.

## Motion

- A key press starts one move; it lasts 900 to 1400 ms and then the scene is completely still. `settled` turns true only then.
- Neighbours leave together: the delay of a dot comes from where it is (a front sweeping along x by default), with 5 % per-dot scatter. Each dot flies a shallow arc, all arcs bowing the same way, so the field turns like a flock instead of crossing like a tween.
- Identity is the order of points in a layout: dot i goes to point i. Left-to-right order everywhere (the samplers already give it), so any state flows from any neighbour left to left, right to right. Inside your own state, order the points of one beat so that index i lands where you want index i of the previous beat to go (state 4: two spectrogram columns are exactly one strip token).
- Nothing moves at rest unless the motion is the content: noise breathing in state 1 beat 0, a plucked string ringing and dying away (`Deck.wobble`). Such motion goes in `live`, never in the layout.
- Sound starts in `enter`, only on a forward step (`info.dir > 0`), delayed to the moment the picture lands.
- `?still=1`: no moves, no `live`, no sound; every state and beat is one seeded, reproducible frame. A beat may name the instant of its live motion to freeze with `stillAt`.
- `prefers-reduced-motion`: moves become cuts.

## Caption layout

Stage 1280 × 720, margins 64 left and right.

```
 y 20   · · · · · · reserve rule (only when dots are parked) · · · · · · · · · · · ·
 y 42   Headline, up to two lines            x 64 .. 864
 y+22   body (optional, under the headline)  x 64 .. 624
 y 140
   ..   the figure: dots, with italic labels placed next to the part they name
 y 600
 y 380  the figure on a strip beat: the number 184 px, its unit 34 px, baseline at y 510 (x 64)
 y 540  token strip (x 64 .. 1216, to y 594)
 y 672  honesty label · source line (x 64)                    beats  4/14  (А)   x .. 1216
```

- Headline: fixed place, top-left, never moves between beats of a state. One per state.
- Body: at most one block, under the headline. Keep it to one or two lines.
- Figure: the state's one number. A strip beat (the last beat of states 2 to 5) has no body; it has `figure: { value: '75', unit: 'кадров кодека в секунду' }`, the number large on the strip and the unit beside it, at most five words. The source line appears only on the beat that shows the number.
- Labels: italic, next to what they name, no leader lines, no boxes. Position is the top-left corner of the text; with `align: 'right'` x is the right edge, with `align: 'center'` the centre. Keep them 16 px or more away from dots.
- Bottom line, left: the honesty label first (`tag: 'live'` gives «считается в браузере», `tag: 'schema'` gives «схема»), then the source line(s) with `data-v`.
- Counter, bottom right: a dot per beat (large = reached), `n/14`. No speaker names or letters on screen. Keep dots out of x > 1080, y > 650 and out of the bottom-left line.
- At most one control, built into `control`; style comes from the engine (text buttons, the chosen one ink-filled).

## Lightness rules, as numbers

| Rule | Limit |
|---|---|
| focal elements per beat | 1 (the dots); captions name it, they do not compete |
| headline | ≤ 8 words, ≤ 2 lines |
| body | ≤ 25 words per state |
| labels | ≤ 4 per beat, ≤ 3 words each |
| text size | ≥ 22 px, except src (15) and counter (15) |
| numbers on screen | ≤ 1 per state, with a source line; nothing that is not in `facts.md` or computed live |
| controls | ≤ 1 per state |
| boxes, rules, leader lines, axes with ticks | 0 |
| inks | 2; accent dots only for what sounds or answers |
| dots on stage | exactly 4096 (`__deck.dotCount`) |
| contrast of text | 15.8:1 (ink on paper) |

`shot.mjs` prints the measured word counts, smallest text, control count and dot count under every PNG.

## Engine interface for state authors

A state is one file, `src/states/NN-slug.js` (`NN` = 01 … 14), that calls `Deck.state(n, def)` once. Plain script, no imports; everything hangs off the global `Deck`. A state number without a file shows a placeholder (the dots form the number).

```
Deck.state(n, {
  setup() -> s,            // optional, runs once, lazily; compute points here and return them
  beats: [                 // one or more; forward presses walk them before leaving the state
    {
      layout(s) -> Deck.layout(...),         // required: where the 4096 dots go (cached)
      caption: {...} | (s) => ({...}),        // words; see below
      move: { ms, stagger, spread, curl },    // how the dots travel INTO this beat
      enter(s, info) {},                      // side effects on arrival; info.dir is +1, -1 or 0
      live(t, frame, s) -> bool,              // motion at rest; t = seconds since the dots settled
      stillAt: 0.1,                           // optional: the t of live() to show in ?still=1
    },
  ],
});
```

### A complete state to copy

```js
// State 5 (А). Example only: a plucked dombra, then the strip.
(function () {
  'use strict';
  const Deck = window.Deck, M = Deck.MARGIN;

  Deck.state(5, {
    setup() {
      // All 4096 dots form the dombra; string dots carry s (string) and t (0 bridge .. 1 nut).
      const dombra = Deck.pts.dombra({ cx: 640, cy: 380, length: 1120 });
      const idx = [], t = [];
      dombra.forEach((p, i) => { if (p.part === 'string' && p.s === 0) { idx.push(i); t.push(p.t); } });
      return {
        dombra,
        strip: Deck.pts.strip(),                       // 64 tokens x 64 dots, left to right
        ring: Deck.wobble({ idx, t, normal: dombra.normal, amp: 6, hz: 9, decay: 0.8 }),
      };
    },
    beats: [
      {
        layout: (s) => Deck.layout(s.dombra),
        caption: {
          headline: 'Видео — патчи во времени',
          labels: [{ text: 'струна звучит', x: 700, y: 300 }],
          tag: 'schema',
        },
        move: { ms: 1200, stagger: 'x' },
        enter(s, info) { if (info.dir > 0) Deck.sound.play(Deck.sound.string('D3'), { delay: 1.1 }); },
        live: (t, frame, s) => s.ring(t, frame),       // rings, dies away, returns false: settled
        stillAt: 0.03,                                 // the still frame shows the string displaced
      },
      {
        layout: (s) => Deck.layout(s.strip),
        caption: {
          headline: 'Видео — патчи во времени',
          figure: { value: '1', unit: 'кадр в секунду' },
          tag: 'schema',
          src: { text: 'Источник: издатель, год', v: 'V-10' },
        },
        move: { ms: 1300, stagger: 'index', spread: 0.55, curl: 0.06 },
      },
    ],
  });
})();
```

### Points and layouts

A point is `{ x, y, r, c }` in stage units: `r` radius (default 2.3), `c` ink (`Deck.K` ink, `Deck.A` accent). Samplers add tags (`g`, `tok`, `col`, `row`, `part`, `s`, `t`, `u`). Points are plain objects in plain arrays: filter, map, concat and recolour them freely; the order you hand to `Deck.layout` is the identity of the dots.

| Helper | Returns |
|---|---|
| `Deck.layout(points, morePoints, ...)` | The beat's arrangement. Concatenates in order. Fewer than 4096 points: the rest park in the reserve rule. More: error in the console, tail cut. |
| `Deck.pts.text(str, { x, y, size, fit, align, weight = 900, tracking, count, pitch, angle = 45 })` | Glyphs as halftone. `y` is the baseline; `fit` is a width in px that overrides `size`; `count` is the exact number of points. Tags: `g` (character index). Extras: `.size`, `.box`, `.pitch`. |
| `Deck.pts.mask(draw, { count, pitch = 6, angle = 45, fill = 0.385, min = 0.3, c })` | Any shape as halftone. `draw(ctx)` fills in stage coordinates on a 1280 × 720 canvas (alpha is tone), or pass a canvas or image. |
| `Deck.pts.path(d, { x, y, scale, stroke, ...mask options })` | An SVG path string or `Path2D`, filled, or stroked with width `stroke`. |
| `Deck.pts.grid({ x, y, cols, rows, dx, dy = dx, r, c, order = 'cols' })` | A straight screen; `(x, y)` is the centre of the top-left dot. Tags: `col`, `row`. |
| `Deck.pts.along(poly, n, { r, c })`, `Deck.pts.line(x1, y1, x2, y2, n, { r, c })` | `n` points evenly along a polyline or a segment. Tag: `u` (0..1). |
| `Deck.pts.strip({ from = 0, tokens = 64, c, y })` | The token strip, 64 points per token, token by token. `c` may be `(tok) => ink`. Tags: `tok`, `col`, `row`. Geometry in `Deck.STRIP` (`x, y, w, h, cy, period, pitch, r`). |
| `Deck.pts.stripToken(tok)` | `{ x0, x1, cx, y0, y1, cy }` of one token, for a label. |
| `Deck.pts.dombra({ cx = 640, cy = 360, length = 1100, angle = 0, strings = 2, count = 4096, fill = 0.43 })` | The dombra, tail left and head right at angle 0 (degrees, clockwise; -24 is a good diagonal). Tags: `part` (`body`, `neck`, `head`, `peg`, `string`), `s`, `t`. Extras: `.pitch`, `.normal`, `.strings` (`[{ x0, y0, x1, y1 }]`). `strings: 6` widens the neck and adds pegs. |
| `Deck.dombra.draw(ctx, opts)` | Fills the dombra silhouette into a canvas context, for `Deck.pts.mask` when you want it on another screen (for example a patch grid). |
| `Deck.pts.reserve(k)` | `k` parked dots (the top rule). `Deck.layout` calls it for you. |
| `Deck.pts.number(n)` | The placeholder figure. |
| `Deck.pts.sortX(points, band = 6)` | Sorts in place into left-to-right order; use after you merge groups that should flow as one. |
| `Deck.pts.paint(points, c, r)`, `Deck.pts.bounds(points)` | Recolour or resize in place; bounding box `{ x0, y0, x1, y1, w, h, cx, cy }`. |
| `Deck.wobble({ idx, t, normal, amp = 5, hz = 11, decay = 0.9, mode = 1 })` | A `live` function: the listed dots vibrate like a string and die away. |
| `Deck.rng(seed)`, `Deck.hash(i, salt)` | Seeded random; never use `Math.random()` or the clock in a layout. |
| `Deck.clamp`, `Deck.lerp`, `Deck.ease.inOut / out / in / linear` | Small maths. |

Constants: `Deck.W` 1280, `Deck.H` 720, `Deck.N` 4096, `Deck.MARGIN` 64, `Deck.K`, `Deck.A`, `Deck.R_MIN`, `Deck.R_FORM`, `Deck.SPEAKERS` (`{ А, Б }`, the one place the names live), `Deck.still`, `Deck.muted`.

### Moves

`move: { ms = 1200, stagger = 'x', spread = 0.45, curl = 0.14, dir = 0, origin = [640, 360] }`

- `stagger`: `'x'` a front sweeps the stage (along `dir` degrees); `'radial'` outward from `origin`; `'index'` in dot order (token by token); `'none'`; or `(i, fromX, fromY, toX, toY) => number` (any scale; it is normalised).
- `spread`: share of `ms` used to stagger the starts. `curl`: how far each dot bows sideways, as a share of its travel.
- Keep `ms` between 900 and 1400.

### Captions

```
caption: {
  headline: 'text',
  body: 'text' | { text | html, x, y, w, size },
  labels: [{ text | html, x, y, align, w, size, mono, upright, weight }],
  figure: { value, unit, y },                           // the one number, large, on the strip; y = baseline, default STRIP.y - 30
  src: 'text' | { text, v } | [{ text, v }, ...],     // v = the V-id from facts.md, lands in data-v
  tag: 'live' | 'schema' | 'your words',
  control: { x, y, key, build(el) {} },                  // put buttons inside el; at most one per state
}
```

`text` is escaped and `\n` breaks the line; `html` is inserted as is. Captions whose words and place did not change between beats stay on screen untouched. The engine sets every `data-role`; do not create stage text any other way. A control's clicks and keys do not advance the deck.

### Sound

Everything is rendered to a `Float32Array` at 44.1 kHz first; pictures and playback use the same buffer.

| Helper | Returns |
|---|---|
| `Deck.sound.string('D3' \| 'G3')` | One open string. |
| `Deck.sound.strum()` | Both open strings, D3 then G3 28 ms later. |
| `Deck.sound.motif()` | A 3.4 s pentatonic motif of our own over the open D string. Not a named кюй. |
| `Deck.sound.pluck(freq, { dur = 2.4, t60 = 2.6, pick = 0.22, bright = 0.5, seed })` | Any pitch (Hz or a name from `Deck.sound.NOTES`: D3 G3 A3 B3 D4 E4). |
| `Deck.sound.mix([{ t, f, gain, string }], dur)` | A sequence; a new note on the same `string` damps the previous one. |
| `Deck.sound.play(buf, { gain = 1, delay = 0 })` | Plays it. Silent before the first key press, when muted and in `?still=1`. Sound stops on every navigation step. |
| `Deck.sound.wave(buf, cols, { from, to })` | `{ min, max, rms }`, one value per column. |
| `Deck.sound.spectrogram(buf, { cols = 128, rows = 32, fmin, fmax, win = 4096, from, to, floor = -54 })` | `{ cols, rows, v, freqs }`; `v[col * rows + row]` is 0..1, row 0 is `fmin`, spacing linear. |
| `Deck.sound.pitch(buf)` | Hz of the strongest partial (checked: 146.9 for D3, 196.0 for G3). |

### Hook and flags (contract)

`window.__deck`: `state` (1-based), `beat` (0-based), `beats`, `total` (14), `settled`, `dotCount` (dots actually on stage, must be 4096), `go(n, beat)`. Outside the contract, for render tools: `mid(n, beat, p)` freezes the move into that beat at share `p`.

Query flags: `?still=1`, `?mute=1`; `?demo=dombra | dombra6 | tilt | strip | reserve` shows a helper's output on its own. Keys: → Space PageDown Enter forward; ← PageUp Backspace back; Home, End; F fullscreen; M mute; `#N` deep link; click the right or left half.

## Seeing your work

```
.scratch/seminar12-multimodal/tools/render.sh "5"                       # every beat of state 5, settled and mid-move
.scratch/seminar12-multimodal/tools/render.sh "5,6" --beat 1            # one beat
.scratch/seminar12-multimodal/tools/render.sh "5" --mid 0.35 --scale 2  # other freeze point, 2560 x 1440
.scratch/seminar12-multimodal/tools/render.sh "" --demo dombra,dombra6,tilt,strip,reserve
```

It bundles, renders in one headless Chrome on the Mac and prints the PNG paths (`.scratch/seminar12-multimodal/shots/sNN-bM.png`, `sNN-bM-mid.png`) with a line of measurements under each. Open the PNGs with the Read tool after every change. Renders are serial: a lock makes parallel agents wait their turn, so render the states you changed in one call instead of many. Never start Chrome, a dev server or an install any other way on the Mac.

Two quicker checks run in Node on the Mac in under a second: `node tools/smoke.mjs` (walks all states against a fake DOM and checks the hook and the 4096 dots) and `node tools/preview.mjs` (paints dots-only PNGs; edit its list at the bottom to add your state; it cannot draw captions or anything sampled from glyphs or masks). `node tools/bundle.mjs` rebuilds `index.html`; a state file with a syntax error is named and shows a placeholder.

## Reference states

- State 1 (`src/states/01-title.js`): beat 0 is the 64 × 64 square of two-ink noise, right of the title; beat 1 is «домбра» in Literata Black across the stage with two accent strings under it, edge to edge, which ring once as the strum sounds.
- State 4 (`src/states/04-sound.js`): the open D string. Beat 0 waveform (dots stacked to the sample extremes), beat 1 spectrogram (128 moments × 32 pitches, rows at multiples of half the string's frequency so every harmonic has its own row; the fundamental row is accent), beat 2 the strip (two columns = one token). The time axis stays put through all three. Its number (75, V-06) sits in the constant `A3` and shows as the figure on beat 2.
