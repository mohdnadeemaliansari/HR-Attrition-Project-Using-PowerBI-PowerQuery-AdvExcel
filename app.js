/* HR Attrition site — shared across all pages.
   Each page sets <body data-page="..."> and this script renders only that page. */
(() => {
  'use strict';

  const PAGE = document.body.dataset.page;

  /* ---------- decode the columnar payload into row objects ---------- */
  const D = HR_DATA, dict = D.dicts, col = D.cols;
  const text = (name, i) => {
    const v = col[name][i];
    return v === -1 || v == null ? null : dict[name][v];
  };
  const ROWS = [];
  for (let i = 0; i < D.n; i++) {
    ROWS.push({
      ageGroup: text('ageGroup', i),
      attrition: text('attrition', i),
      dept: text('dept', i),
      edu: text('edu', i),
      eduField: text('eduField', i),
      gender: text('gender', i),
      jobRole: text('jobRole', i),
      jobSat: col.jobSat[i],
      hike: col.hike[i],
      income: col.income[i],
      rating: col.rating[i],
      wlb: col.wlb[i],
      envSat: col.envSat[i],
      relSat: col.relSat[i],
      involve: col.involve[i],
      age: col.age[i]
    });
  }

  /* ---------- formatting ---------- */
  const pct = v => (v * 100).toFixed(2) + '%';
  const pct1 = v => (v * 100).toFixed(1) + '%';
  const num = v => v.toLocaleString('en-IN');
  const dec = v => v.toFixed(2);

  /* ---------- measures (the four DAX measures, in JS) ---------- */
  const left = rows => rows.filter(r => r.attrition === 'Yes').length;
  const rate = rows => (rows.length ? left(rows) / rows.length : 0);
  const avg = (rows, key) => {
    const v = rows.map(r => r[key]).filter(x => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  };
  const sum = (rows, key) => rows.reduce((a, r) => a + (r[key] || 0), 0);

  function by(rows, field, reducer) {
    const groups = new Map();
    rows.forEach(r => {
      if (r[field] == null) return;
      if (!groups.has(r[field])) groups.set(r[field], []);
      groups.get(r[field]).push(r);
    });
    return [...groups.entries()]
      .map(([label, g]) => ({ label, value: reducer(g), n: g.length }))
      .sort((a, b) => b.value - a.value);
  }
  const ordered = (out, order) => out.slice().sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));

  const AGE_ORDER = ['18-25', '26-35', '36-45', '55', 'Above 55'];
  const EDU_ORDER = ['High School', 'Associates Degree', "Bachelor's Degree", "Master's Degree", 'Doctoral Degree'];

  /* ---------- filters, kept in sessionStorage so they survive page changes ---------- */
  const FILTERS = [
    { key: 'gender', title: 'Gender' },
    { key: 'dept', title: 'Department' },
    { key: 'ageGroup', title: 'Age group' },
    { key: 'eduField', title: 'Education field' }
  ];
  const STORE = 'hrFilters';
  const active = { gender: new Set(), dept: new Set(), ageGroup: new Set(), eduField: new Set() };

  function loadFilters() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) || '{}');
      FILTERS.forEach(f => (saved[f.key] || []).forEach(v => active[f.key].add(v)));
    } catch (e) { /* first visit, or storage unavailable */ }
  }
  function saveFilters() {
    try {
      const out = {};
      FILTERS.forEach(f => (out[f.key] = [...active[f.key]]));
      sessionStorage.setItem(STORE, JSON.stringify(out));
    } catch (e) { /* nothing to do — filters just won't persist */ }
  }

  const applyFilters = () =>
    ROWS.filter(r => FILTERS.every(f => {
      const set = active[f.key];
      return set.size === 0 || (r[f.key] != null && set.has(r[f.key]));
    }));

  function buildFilterUI() {
    const host = document.getElementById('filter-groups');
    if (!host) return;
    FILTERS.forEach(f => {
      const g = document.createElement('div');
      g.className = 'fgroup';
      const h = document.createElement('h4');
      h.textContent = f.title;
      const chips = document.createElement('div');
      chips.className = 'chips';
      dict[f.key].forEach(val => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.textContent = val;
        b.setAttribute('aria-pressed', active[f.key].has(val));
        b.addEventListener('click', () => {
          const set = active[f.key];
          set.has(val) ? set.delete(val) : set.add(val);
          b.setAttribute('aria-pressed', set.has(val));
          saveFilters();
          render();
        });
        chips.appendChild(b);
      });
      g.append(h, chips);
      host.appendChild(g);
    });

    document.getElementById('reset').addEventListener('click', () => {
      FILTERS.forEach(f => active[f.key].clear());
      document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
      saveFilters();
      render();
    });
  }

  function kpis(target, items) {
    const box = document.getElementById(target);
    if (!box) return;
    box.textContent = '';
    items.forEach(([value, label]) => {
      const d = document.createElement('div');
      d.className = 'kpi';
      const b = document.createElement('b');
      b.textContent = value;
      const s = document.createElement('span');
      s.textContent = label;
      d.append(b, s);
      box.appendChild(d);
    });
  }

  /* ---------- render the current page ---------- */
  function render() {
    const rows = applyFilters();
    const withEmp = rows.filter(r => r.gender != null);

    const scope = document.getElementById('scope');
    if (scope) {
      const chosen = FILTERS.flatMap(f => [...active[f.key]]);
      scope.textContent = chosen.length
        ? `${num(rows.length)} of 1,470 employees — ${chosen.join(', ')}`
        : 'All 1,470 employees in view';
    }

    if (PAGE === 'overview') {
      document.getElementById('heroRate').textContent = rows.length ? pct(rate(rows)) : '—';
      document.getElementById('heroSub').textContent =
        `${num(left(rows))} of ${num(rows.length)} employees in the current selection have left the organisation.`;

      const stayed = rows.length - left(rows);
      const split = document.getElementById('heroSplit');
      split.textContent = '';
      [['Left', left(rows), ''], ['Still here', stayed, 'stay']].forEach(([label, v, cls]) => {
        const row = document.createElement('div');
        row.className = 'split-row';
        const b = document.createElement('b'); b.textContent = label;
        const bar = document.createElement('div'); bar.className = 'bar ' + cls;
        const i = document.createElement('i');
        i.style.width = (rows.length ? (v / rows.length) * 100 : 0) + '%';
        bar.appendChild(i);
        const s = document.createElement('span');
        s.textContent = `${num(v)} · ${rows.length ? pct1(v / rows.length) : '0%'}`;
        row.append(b, bar, s);
        split.appendChild(row);
      });

      kpis('kpis', [
        [num(rows.length), 'Employees in view'],
        [num(left(rows)), 'Left the company'],
        [num(stayed), 'Retained'],
        [rows.length ? pct(rate(rows)) : '—', 'Attrition rate']
      ]);

      Charts.pie('ovDept', by(rows, 'dept', rate), {
        donut: true, fmt: pct1, center: rows.length ? pct1(rate(rows)) : '—', centerLabel: 'overall'
      });
      Charts.vbar('ovAge', ordered(by(rows, 'ageGroup', rate), AGE_ORDER), { fmt: pct1 });
      Charts.hbar('ovRole', by(withEmp, 'jobRole', rate), { fmt: pct1, labelWidth: 170 });
    }

    if (PAGE === 'attrition') {
      kpis('kpis2', [
        [num(rows.length), 'Total count'],
        [num(left(rows)), 'Attrition employees'],
        [num(rows.length - left(rows)), 'Regular employees'],
        [rows.length ? pct(rate(rows)) : '—', 'Attrition rate']
      ]);
      Charts.pie('atGender', by(withEmp, 'gender', rate), { fmt: pct1 });
      Charts.pie('atDept', by(rows, 'dept', rate), { donut: true, fmt: pct1 });
      Charts.hbar('atEdu', ordered(by(rows, 'edu', rate), EDU_ORDER), { fmt: pct1, labelWidth: 160 });
      Charts.hbar('atField', by(rows, 'eduField', rate), { fmt: pct1, labelWidth: 160 });
      Charts.vbar('atRole', by(withEmp, 'jobRole', rate), { fmt: pct1 });
    }

    if (PAGE === 'performance') {
      kpis('kpis3', [
        [rows.length ? dec(avg(rows, 'jobSat')) : '—', 'Avg job satisfaction (1–4)'],
        [rows.length ? dec(avg(rows, 'envSat')) : '—', 'Avg environment score'],
        [rows.length ? dec(avg(rows, 'wlb')) : '—', 'Avg work-life balance'],
        [rows.length ? pct1(rows.filter(r => r.rating === 4).length / rows.length) : '—', 'Rated 4 on performance']
      ]);
      Charts.pie('pfDept', by(rows, 'dept', g => sum(g, 'jobSat')), { fmt: num });
      Charts.pie('pfGender', by(withEmp, 'gender', g => sum(g, 'jobSat')), { fmt: num });
      Charts.treemap('pfRole', by(withEmp, 'jobRole', g => sum(g, 'jobSat')), { fmt: num, height: 340 });
      Charts.hbar('pfEdu', ordered(by(rows, 'edu', g => avg(g, 'jobSat')), EDU_ORDER), { fmt: dec, labelWidth: 160 });
      Charts.hbar('pfField', by(rows, 'eduField', g => avg(g, 'jobSat')), { fmt: dec, labelWidth: 160 });
    }

    if (PAGE === 'salary') {
      kpis('kpis4', [
        [rows.length ? avg(rows, 'hike').toFixed(2) + '%' : '—', 'Average salary hike'],
        [rows.length ? Math.max(...rows.map(r => r.hike || 0)) + '%' : '—', 'Highest hike granted'],
        [rows.length ? '₹' + num(Math.round(avg(rows, 'income'))) : '—', 'Average monthly income'],
        [num(sum(rows, 'hike')), 'Total hike points']
      ]);
      Charts.pie('slGender', by(withEmp, 'gender', g => sum(g, 'hike')), { fmt: num });
      Charts.pie('slDept', by(rows, 'dept', g => sum(g, 'hike')), { fmt: num });
      Charts.pie('slField', by(rows, 'eduField', g => avg(g, 'hike')), { donut: true, fmt: v => v.toFixed(2) + '%' });
      Charts.vbar('slAge', ordered(by(rows, 'ageGroup', g => avg(g, 'hike')), AGE_ORDER), { fmt: v => v.toFixed(1) + '%' });
      Charts.hbar('slRole', by(withEmp, 'jobRole', g => avg(g, 'hike')), { fmt: v => v.toFixed(2) + '%', labelWidth: 170 });
      Charts.vbar('slEdu', ordered(by(rows, 'edu', g => sum(g, 'hike')), EDU_ORDER), { fmt: num });
    }
  }

  /* ---------- written pages ---------- */
  const INSIGHTS = [
    ['Overall attrition', 'Scale of the problem', [
      'The overall attrition rate is <b>16.12%</b>, a moderate level of turnover.',
      'Out of 1,470 employees, <b>237</b> have left the organisation.'
    ]],
    ['Department', 'Where losses concentrate', [
      'Sales carries the highest attrition rate at <b>20.63%</b>, followed by HR (19.05%) and R &amp; D (13.88%).',
      'Admin records no attrition, but it holds only 3 employees, so the figure is not meaningful.'
    ]],
    ['Gender', 'A balanced split', [
      'Female employees leave slightly more often (<b>16.55%</b>) than male employees (15.65%).',
      'The gap is small, so gender is not a useful predictor here on its own.'
    ]],
    ['Age group', 'Early-career risk', [
      'The 18–25 group has by far the highest attrition rate at <b>35.77%</b>.',
      'Attrition drops sharply with age, falling to 9.19% in the 36–45 group.'
    ]],
    ['Job role', 'Roles under pressure', [
      'Human Resources has the highest role-level attrition at <b>30.00%</b>.',
      'Research Director (20%) and Healthcare Representative (18.60%) follow.',
      'Manager is the most stable role at 8.86%.'
    ]],
    ['Education', 'Qualification matters', [
      'High School background carries the highest attrition at <b>18.24%</b>.',
      'Attrition decreases as education level rises; Doctoral Degree holders sit lowest at 10.42%.',
      'By field, Human Resources (25.93%), Technical Degree (24.24%) and Marketing (22.01%) lead.'
    ]],
    ['Performance &amp; satisfaction', 'The link to leaving', [
      'Job satisfaction varies across departments, genders, roles and education fields.',
      'Groups with lower job satisfaction tend to show higher attrition.',
      'Lifting satisfaction is the most direct lever on turnover.'
    ]],
    ['Salary hike', 'Compensation signal', [
      'Average percent salary hike sits close to <b>15%</b> across most categories.',
      'Some low-satisfaction groups still receive higher hikes, so pay alone is not holding people.'
    ]],
    ['Key takeaways', 'What to act on', [
      'Focus on high-attrition departments (Sales, HR, R &amp; D) and critical roles (HR, Research Director).',
      'Build targeted retention for younger employees aged 18–25.',
      'Strengthen job satisfaction, career growth and compensation plans together.'
    ]],
    ['Opportunities', 'Where to invest', [
      'Strengthen onboarding and mentorship for early-career employees.',
      'Improve engagement and recognition programmes.',
      'Review workload, career progression and market benchmarks for high-risk groups.'
    ]],
    ['Business impact', 'Why it pays off', [
      'Reducing attrition retains talent, protects productivity and lowers hiring costs.',
      'A more engaged workforce leads to better performance and business growth.'
    ]],
    ['Final insight', 'The bigger picture', [
      'A data-driven approach to attrition builds a stronger, more stable organisation.',
      'Investment in development, satisfaction and fair pay is what sustains it.'
    ]]
  ];

  const PLAN = [
    ['Strategic objectives', 'What we aim to achieve', [
      '<b>Reduce attrition rate</b> — bring overall attrition from 16.12% to below 10% within 12 months.',
      '<b>Improve employee experience</b> — raise job satisfaction, engagement and growth opportunities.',
      '<b>Strengthen critical teams</b> — focus on high-attrition departments and key roles.',
      '<b>Build a future-ready workforce</b> — attract, retain and develop talent for the long term.'
    ]],
    ['Action plan', 'How we will get there', [
      '<b>Retention initiatives</b> — targeted strategies for high-risk employees and critical roles.',
      '<b>Career development</b> — upskilling, mentorship and clear progression paths.',
      '<b>Competitive compensation</b> — align salary structure with market trends and performance.',
      '<b>Employee engagement</b> — regular feedback, recognition and wellness initiatives.'
    ]],
    ['Key focus areas', 'What we will prioritise', [
      '<b>High-attrition departments</b> — Sales, HR and R &amp; D.',
      '<b>Critical job roles</b> — Human Resources, Research Director and Healthcare Representative.',
      '<b>Early-career employees</b> — the 18–25 group, with mentorship and development.',
      '<b>Education segments</b> — High School and Bachelor\'s degree employees.'
    ]],
    ['Expected outcomes', 'What success looks like', [
      '<b>Lower attrition</b> — a more stable and experienced workforce.',
      '<b>Higher engagement</b> — improved job satisfaction and productivity.',
      '<b>Stronger talent pipeline</b> — better retention of young and high-potential employees.',
      '<b>Positive business impact</b> — reduced hiring costs and sustainable growth.'
    ]]
  ];

  function cards(hostId, items) {
    const host = document.getElementById(hostId);
    if (!host) return;
    items.forEach(([title, sub, points], i) => {
      const a = document.createElement('article');
      a.className = 'ins';
      a.innerHTML = `<h3><em>${i + 1}</em>${title}</h3><h4>${sub}</h4>` +
        `<ul>${points.map(p => `<li>${p}</li>`).join('')}</ul>`;
      host.appendChild(a);
    });
  }

  if (PAGE === 'insights') cards('insights', INSIGHTS);

  if (PAGE === 'action') {
    cards('plan', PLAN);
    const steps = document.getElementById('steps');
    ['Validate insights with stakeholders.', 'Finalise and implement action plans.',
      'Monitor progress with defined KPIs.', 'Review and refine strategies periodically.']
      .forEach(t => {
        const li = document.createElement('li');
        li.textContent = t;
        steps.appendChild(li);
      });
  }

  loadFilters();
  buildFilterUI();
  render();
})();
