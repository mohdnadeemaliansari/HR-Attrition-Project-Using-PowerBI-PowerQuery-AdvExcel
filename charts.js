/* Small SVG chart set — no libraries, no build step. */
const Charts = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const PALETTE = ['#b5501f','#e07a3f','#f0a06a','#8c3c17','#c96a34','#f6c69b','#6f2f12','#d98b55','#a8562b'];
  const tip = () => document.getElementById('tip');

  const el = (name, attrs = {}, text) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  };

  const svg = (w, h) => el('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', preserveAspectRatio: 'xMidYMid meet' });

  function hover(node, label) {
    node.addEventListener('pointerenter', e => {
      const t = tip();
      t.textContent = label;
      t.classList.add('on');
      t.style.left = e.clientX + 'px';
      t.style.top = e.clientY + 'px';
    });
    node.addEventListener('pointermove', e => {
      const t = tip();
      t.style.left = e.clientX + 'px';
      t.style.top = e.clientY + 'px';
    });
    node.addEventListener('pointerleave', () => tip().classList.remove('on'));
  }

  function mount(target, node, legendItems) {
    const box = typeof target === 'string' ? document.getElementById(target) : target;
    box.textContent = '';
    if (!node) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'No rows match the current filters.';
      box.appendChild(p);
      return;
    }
    box.appendChild(node);
    if (legendItems && legendItems.length) {
      const l = document.createElement('div');
      l.className = 'legend';
      legendItems.forEach(([name, color]) => {
        const s = document.createElement('span');
        const i = document.createElement('i');
        i.style.background = color;
        s.append(i, document.createTextNode(name));
        l.appendChild(s);
      });
      box.appendChild(l);
    }
  }

  /* ---- pie / donut ---- */
  function pie(target, rows, opts = {}) {
    const data = rows.filter(r => r.value > 0);
    if (!data.length) return mount(target, null);
    const size = 300, r = 118, cx = size / 2, cy = size / 2;
    const inner = opts.donut ? r * 0.56 : 0;
    const total = data.reduce((s, d) => s + d.value, 0);
    const s = svg(size, size);
    let a0 = -Math.PI / 2;

    data.forEach((d, i) => {
      const a1 = a0 + (d.value / total) * Math.PI * 2;
      const color = PALETTE[i % PALETTE.length];
      const big = a1 - a0 > Math.PI ? 1 : 0;
      const p = [
        `M ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)}`,
        `A ${r} ${r} 0 ${big} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`
      ];
      if (inner) {
        p.push(`L ${cx + inner * Math.cos(a1)} ${cy + inner * Math.sin(a1)}`);
        p.push(`A ${inner} ${inner} 0 ${big} 0 ${cx + inner * Math.cos(a0)} ${cy + inner * Math.sin(a0)} Z`);
      } else {
        p.push(`L ${cx} ${cy} Z`);
      }
      const path = el('path', { d: p.join(' '), fill: color, stroke: '#24140f', 'stroke-width': 2 });
      hover(path, `${d.label}: ${opts.fmt ? opts.fmt(d.value) : d.value}`);
      s.appendChild(path);

      const share = d.value / total;
      if (share > 0.06) {
        const am = (a0 + a1) / 2, rl = inner ? (r + inner) / 2 : r * 0.64;
        s.appendChild(el('text', {
          x: cx + rl * Math.cos(am), y: cy + rl * Math.sin(am),
          'text-anchor': 'middle', 'dominant-baseline': 'middle',
          fill: '#fff', 'font-size': 12, 'font-weight': 600, class: 'seg'
        }, Math.round(share * 100) + '%'));
      }
      a0 = a1;
    });

    if (inner && opts.center) {
      s.appendChild(el('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', fill: '#fff', 'font-size': 22, 'font-weight': 800, class: 'seg' }, opts.center));
      s.appendChild(el('text', { x: cx, y: cy + 15, 'text-anchor': 'middle', fill: '#c2a091', 'font-size': 11 }, opts.centerLabel || ''));
    }
    mount(target, s, data.map((d, i) => [d.label, PALETTE[i % PALETTE.length]]));
  }

  /* ---- horizontal bars ---- */
  function hbar(target, rows, opts = {}) {
    const data = rows.filter(r => r.value !== null && !isNaN(r.value));
    if (!data.length) return mount(target, null);
    const padL = opts.labelWidth || 150, padR = 54, rowH = 34, top = 6;
    const w = 620, h = top + data.length * rowH + 8;
    const max = Math.max(...data.map(d => d.value)) || 1;
    const s = svg(w, h);

    data.forEach((d, i) => {
      const y = top + i * rowH;
      const bw = Math.max(2, (d.value / max) * (w - padL - padR));
      s.appendChild(el('text', { x: padL - 10, y: y + 18, 'text-anchor': 'end', fill: '#c2a091', 'font-size': 12.5 }, d.label));
      const rect = el('rect', { x: padL, y: y + 6, width: bw, height: 18, rx: 4, fill: opts.color || PALETTE[i % PALETTE.length] });
      hover(rect, `${d.label}: ${opts.fmt ? opts.fmt(d.value) : d.value}`);
      s.appendChild(rect);
      s.appendChild(el('text', { x: padL + bw + 8, y: y + 20, fill: '#f4e3d7', 'font-size': 12, 'font-weight': 600, class: 'seg' },
        opts.fmt ? opts.fmt(d.value) : d.value));
    });
    mount(target, s);
  }

  /* ---- vertical columns ---- */
  function vbar(target, rows, opts = {}) {
    const data = rows.filter(r => r.value !== null && !isNaN(r.value));
    if (!data.length) return mount(target, null);
    const w = 720, h = 330, padB = 74, padT = 26, padL = 14;
    const max = Math.max(...data.map(d => d.value)) || 1;
    const bandW = (w - padL * 2) / data.length;
    const s = svg(w, h);

    s.appendChild(el('line', { x1: padL, y1: h - padB, x2: w - padL, y2: h - padB, stroke: '#4a2a1e' }));

    data.forEach((d, i) => {
      const bh = (d.value / max) * (h - padB - padT);
      const x = padL + i * bandW + bandW * 0.18;
      const bw = bandW * 0.64;
      const y = h - padB - bh;
      const rect = el('rect', { x, y, width: bw, height: Math.max(2, bh), rx: 4, fill: opts.color || PALETTE[i % PALETTE.length] });
      hover(rect, `${d.label}: ${opts.fmt ? opts.fmt(d.value) : d.value}`);
      s.appendChild(rect);
      s.appendChild(el('text', { x: x + bw / 2, y: y - 7, 'text-anchor': 'middle', fill: '#f4e3d7', 'font-size': 11.5, 'font-weight': 600, class: 'seg' },
        opts.fmt ? opts.fmt(d.value) : d.value));
      const label = el('text', {
        x: x + bw / 2, y: h - padB + 12, 'text-anchor': 'end', fill: '#c2a091', 'font-size': 11.5,
        transform: `rotate(-38 ${x + bw / 2} ${h - padB + 12})`
      }, d.label);
      s.appendChild(label);
    });
    mount(target, s);
  }

  /* ---- treemap (squarified-ish, slice and dice) ---- */
  function treemap(target, rows, opts = {}) {
    const data = rows.filter(r => r.value > 0).sort((a, b) => b.value - a.value);
    if (!data.length) return mount(target, null);
    const w = 700, h = opts.height || 320;
    const total = data.reduce((s, d) => s + d.value, 0);
    const s = svg(w, h);

    let x = 0, y = 0, rw = w, rh = h, idx = 0;
    while (idx < data.length) {
      const remaining = data.slice(idx).reduce((a, d) => a + d.value, 0);
      const d = data[idx];
      const frac = d.value / remaining;
      const horizontal = rw >= rh;
      const bw = horizontal ? (idx === data.length - 1 ? rw : rw * frac) : rw;
      const bh = horizontal ? rh : (idx === data.length - 1 ? rh : rh * frac);

      const color = PALETTE[idx % PALETTE.length];
      const rect = el('rect', { x: x + 1.5, y: y + 1.5, width: Math.max(0, bw - 3), height: Math.max(0, bh - 3), rx: 6, fill: color });
      hover(rect, `${d.label}: ${opts.fmt ? opts.fmt(d.value) : d.value}`);
      s.appendChild(rect);

      if (bw > 74 && bh > 34) {
        s.appendChild(el('text', { x: x + 12, y: y + 22, fill: '#fff5ee', 'font-size': 12.5, 'font-weight': 600 },
          d.label.length > Math.floor(bw / 8) ? d.label.slice(0, Math.floor(bw / 8) - 1) + '…' : d.label));
        s.appendChild(el('text', { x: x + 12, y: y + 39, fill: '#ffffffcc', 'font-size': 12, class: 'seg' },
          opts.fmt ? opts.fmt(d.value) : d.value));
      }

      if (horizontal) { x += bw; rw -= bw; } else { y += bh; rh -= bh; }
      idx++;
    }
    mount(target, s);
  }

  return { pie, hbar, vbar, treemap, PALETTE };
})();
