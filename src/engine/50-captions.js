// The caption layer: a DOM layer over the dots. Every text node sits in an element with
// data-role = headline | body | label | src | control | counter (contract with the checks).
// Positions and sizes come from DESIGN.md; a state gives words, not styles.
(function () {
  'use strict';
  const Deck = window.Deck;
  const TAGS = { live: 'считается в браузере', schema: 'схема' };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  // The text faces carry no arrows, so arrows are drawn: one weight, one shape, any direction.
  const ARROW = { '→': 0, '↓': 90, '←': 180, '↑': 270 };
  const arrows = (html) =>
    html.replace(/[→←↑↓]/g, (a) => `<svg class="arr" viewBox="0 0 30 20" role="img" aria-label="${a}" style="transform:rotate(${ARROW[a]}deg)"><path d="M1 10h26M19 2.5l8 7.5-8 7.5" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>`);
  const html = (it) => arrows(it.html != null ? it.html : esc(it.text));

  let layer, foot, counter, shown = new Map();

  function el(role, key, build) {
    let node = shown.get(key);
    if (node) {
      node.__keep = true;
      return node;
    }
    node = document.createElement('div');
    node.dataset.role = role;
    node.__key = key;
    node.__keep = true;
    node.__fresh = true;
    build(node);
    shown.set(key, node);
    return node;
  }

  function place(node, it) {
    const s = node.style;
    if (it.x != null) {
      if (it.align === 'right') { s.right = Deck.W - it.x + 'px'; s.left = 'auto'; s.textAlign = 'right'; }
      else if (it.align === 'center') { s.left = it.x + 'px'; s.transform = 'translateX(-50%)'; s.textAlign = 'center'; }
      else s.left = it.x + 'px';
    }
    if (it.y != null) s.top = it.y + 'px';
    if (it.w) { s.width = it.w + 'px'; s.maxWidth = 'none'; }
    if (it.size) s.fontSize = Math.max(22, it.size) + 'px';
    if (it.weight) s.fontWeight = it.weight;
    if (it.mono) node.classList.add('mono');
    if (it.upright) node.classList.add('upright');
  }

  const captions = (Deck.captions = {
    init(root) {
      layer = root;
      foot = document.createElement('div');
      foot.id = 'foot';
      layer.appendChild(foot);
      counter = document.createElement('div');
      counter.dataset.role = 'counter';
      layer.appendChild(counter);
    },

    // Deck.captions.show(spec, instant): replace what is on stage with `spec`.
    // Elements whose role and words did not change stay put, without a flicker.
    //   spec {
    //     headline: 'text' | { text | html, w },
    //     body:     'text' | { text | html, x, y, w, size },      default: under the headline
    //     labels:   [{ text | html, x, y, align = 'left' | 'center' | 'right', w, size, mono, upright, weight }],
    //     figure:   { value, unit, y }                             the state's one number, large, above the strip
    //     src:      'text' | { text, v } | [{ text, v }, ...],    bottom-left; v = the V-id from facts.md
    //     tag:      'live' | 'schema' | 'any words',                honesty label, bottom-left
    //     control:  { x, y, align, build(el) }                       at most one per state
    //   }
    show(spec, instant) {
      spec = spec || {};
      for (const node of shown.values()) node.__keep = false;
      const add = (parent, node) => { if (node.__fresh) parent.appendChild(node); return node; };
      const norm = (v) => (v == null || v === '' ? null : typeof v === 'string' ? { text: v } : v);

      const h = norm(spec.headline);
      let hNode = null;
      if (h) hNode = add(layer, el('headline', 'h|' + html(h), (n) => { n.innerHTML = html(h); place(n, h); }));

      const b = norm(spec.body);
      if (b) {
        const n = add(layer, el('body', 'b|' + html(b) + '|' + (b.x || '') + '|' + (b.y || ''), (n) => { n.innerHTML = html(b); place(n, b); }));
        if (b.y == null) n.style.top = (hNode ? hNode.offsetTop + hNode.offsetHeight + 22 : 48) + 'px';
      }

      for (const it of spec.labels || [])
        add(layer, el('label', ['l', html(it), it.x, it.y, it.align, it.size].join('|'), (n) => { n.innerHTML = html(it); place(n, it); }));

      // the figure: the one number of a state, set large on the token strip, its unit beside it
      const f = spec.figure;
      if (f)
        add(layer, el('label', ['f', f.value, f.unit, f.y].join('|'), (n) => {
          n.className = 'figure';
          n.innerHTML = `<b>${esc(f.value)}</b><span>${arrows(esc(f.unit || ''))}</span>`;
          n.style.bottom = Deck.H - (f.y != null ? f.y : Deck.STRIP.y - 30) + 'px';
        }));

      const c = spec.control;
      if (c) add(layer, el('control', 'c|' + (c.key || 'control'), (n) => { place(n, c); c.build(n); }));

      // the bottom line: honesty label first, then the sources
      if (spec.tag) {
        // next to a verified figure, «схема» alone could be read as "the number is schematic"
        const words = spec.tag === 'schema' && spec.figure ? 'рисунок — схема' : TAGS[spec.tag] || spec.tag;
        foot.appendChild(el('label', 't|' + words, (n) => { n.className = 'tag'; n.innerHTML = esc(words); })); // always first
      }
      const srcs = spec.src ? (Array.isArray(spec.src) ? spec.src : [spec.src]).map(norm) : [];
      for (const s of srcs) foot.appendChild(el('src', 's|' + s.text + '|' + s.v, (n) => { n.innerHTML = html(s); n.dataset.v = s.v || ''; }));

      for (const [key, node] of shown) {
        if (node.__keep) {
          if (node.__fresh) {
            node.__fresh = false;
            if (!instant) node.animate([{ opacity: 0 }, { opacity: 0 }, { opacity: 1 }], { duration: 520, easing: 'ease-out' });
          }
          continue;
        }
        shown.delete(key);
        if (instant) node.remove();
        else {
          node.style.pointerEvents = 'none';
          node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).onfinish = () => node.remove();
          if (node.parentNode === foot) node.style.position = 'absolute'; // leave the flow at once
        }
      }
    },

    // The corner counter: speaker letter in a dot, state number, one small dot per beat.
    counter(n, beat, beats) {
      const who = Deck.speakerOf(n);
      let pips = '';
      if (beats > 1) for (let i = 0; i < beats; i++) pips += `<i class="${i <= beat ? 'on' : ''}"></i>`;
      counter.innerHTML =
        `<span class="mute">без звука</span><span class="pips">${pips}</span>` +
        `<span class="num">${n}/${Deck.TOTAL}</span><span class="who" title="${esc(who.name)}">${who.letter}</span>`;
      counter.classList.toggle('muted', Deck.muted && !Deck.still);
    },
  });
})();
