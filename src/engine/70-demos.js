// Engine demos for builders: index.html?still=1&demo=NAME shows a helper's output on its own.
// They are not states. render.sh takes them as `--demo dombra,dombra6,strip,reserve`.
(function () {
  'use strict';
  const Deck = window.Deck;
  const one = (layout, caption) => ({ beats: [{ layout, caption }] });
  Deck.demos.dombra = one(() => Deck.layout(Deck.pts.dombra({ cx: 640, cy: 390, length: 1120 })), { headline: 'Deck.pts.dombra()', tag: 'schema' });
  Deck.demos.dombra6 = one(() => Deck.layout(Deck.pts.dombra({ cx: 640, cy: 390, length: 1120, strings: 6 })), { headline: 'Deck.pts.dombra({ strings: 6 })', tag: 'schema' });
  Deck.demos.tilt = one(() => Deck.layout(Deck.pts.dombra({ cx: 700, cy: 330, length: 900, angle: -24, count: 3200 }), Deck.pts.strip({ tokens: 14 })), {
    headline: 'angle: -24, count: 3200, 14 tokens',
  });
  Deck.demos.strip = one(() => Deck.layout(Deck.pts.strip()), { headline: 'Deck.pts.strip()', labels: [{ text: 'токены', x: Deck.MARGIN, y: Deck.STRIP.y - 44 }] });
  Deck.demos.reserve = one(() => Deck.layout(Deck.pts.text('звук', { x: 640, y: 470, size: 300, align: 'center', count: 3400 })), { headline: 'Reserve: 696 dots parked in the top rule' });
})();
