// VECTOR Weather · walk window — zero dependencies.
// <section class="vw" data-assets="assets/"></section> becomes the whole Today screen of a weather app.
// "Find 30 dry minutes" walks the 3-hour rain forecast in 5-minute steps, left to right:
// wet steps dim, a dry break under 30 minutes is marked "too short", dry steps light up amber
// until six in a row are found; "Remind me" puts that half hour into today's plans.
;(() => {
  'use strict';

  const START = 13 * 60 + 50;      // the first step is 1:50 PM
  const PITCH = 19.5;              // px between bars
  const NEED = 6;                  // 6 steps × 5 min = 30 dry minutes
  const STEP_MS = 100;             // one step checked every 100 ms
  const PLAN_MS = 700;             // the plan row lands after the button has turned
  // rain in mm/h for 36 five-minute steps and the rain chance for 18 ten-minute cells
  const FORECASTS = {
    showers: {
      mm: [0.5, 0.9, 1.4, 0.7, 0, 0, 0, 0.3, 0.8, 0.4, 0, 0, 0, 0, 0, 0, 0.3, 0.9, 1.6, 2.4, 3.1, 3.6, 3.0, 2.2, 1.7, 1.2, 0.8, 0.5, 0.4, 0.6, 1.0, 1.4, 1.1, 0.7, 0.4, 0.3],
      chance: [90, 85, 30, 45, 75, 6, 4, 9, 60, 85, 95, 95, 90, 80, 60, 55, 70, 75],
      later: 'Rain eases after 7 PM.',
    },
    steady: {
      mm: [0.5, 0.9, 1.4, 0.7, 0, 0, 0, 0.3, 0.8, 0.4, 0, 0.3, 0, 0.5, 0.2, 0, 0.3, 0.9, 1.6, 2.4, 3.1, 3.6, 3.0, 2.2, 1.7, 1.2, 0.8, 0.5, 0.4, 0.6, 1.0, 1.4, 1.1, 0.7, 0.4, 0.3],
      chance: [90, 85, 30, 45, 75, 55, 40, 50, 60, 85, 95, 95, 90, 80, 60, 55, 70, 75],
      later: 'Rain eases after 7 PM.',
    },
  };

  const deg = c => `<data data-c="${c}" value="${c}">${c}</data>°`;   // every temperature follows the °C / °F switch
  const clock = m => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, '0')}`;
  const at = i => START + i * 5;
  const level = v => (v === 0 ? 'dry' : v < 1 ? 'light' : v <= 2.5 ? 'moderate' : 'heavy');

  const svg = (d, o = {}) => `<svg width="${o.s || 18}" height="${o.s || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${o.w || 1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const P = {
    today: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
    hourly: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    days: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    radar: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12 18 6"/>',
    wind: '<path d="M4 9h11a3 3 0 1 0-3-3M4 15h14a3 3 0 1 1-3 3M4 12h8"/>',
    places: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
    alerts: '<path d="M12 4 3 20h18z"/><path d="M12 10v4M12 17v.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    find: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v3l2 1.5"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    cloud: '<path d="M7 15h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 7 8.4 3.3 3.3 0 0 0 7 15z"/>',
    walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="m9 21 2.5-7.5L14 16v5M8 11l3-3.5 3 1.5 2 3M11.5 13.5 10 9"/>',
    bag: '<path d="M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.5"/>',
  };
  const DROPS3 = 'M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5', DROPS2 = 'M10 18l-1 2.5M15 18l-1 2.5';
  const NAV = [['today', 'Today'], ['hourly', 'Hourly'], ['days', '10 days'], ['radar', 'Radar'], ['wind', 'Wind &amp; air'], ['places', 'Places', '4'], ['alerts', 'Alerts', '1'], ['settings', 'Settings']];
  const HOURS = [['2 PM', 11, 70], ['3 PM', 11, 85], ['4 PM', 10, 95], ['5 PM', 9, 80], ['6 PM', 8, 70], ['7 PM', 8, 60], ['8 PM', 7, 55], ['9 PM', 7, 40]];
  const DAYS = [['Wed', 'rain', 60, 4, 9, 10, 45], ['Thu', 'cloud', 20, 3, 8, 0, 50], ['Fri', 'sun', 10, 5, 10, 20, 50], ['Sat', 'rain', 40, 6, 11, 30, 50], ['Sun', 'rain', 70, 5, 9, 20, 40]];
  const PLACES = [['park', 'Kelmore Park', '0.6 km · light rain', 11, 'Kelmore Park path'], ['pier', 'Ostend Pier', '3.1 km · rain, wind 31 km/h', 10, 'Ostend Pier on a grey day'], ['linden', 'Home · Linden St', 'here · light rain', 11, 'Linden Street with autumn trees']];

  class WeatherApp {
    constructor(root) {
      this.root = root;
      const A = root.dataset.assets || 'assets/';
      const img = (n, alt) => `<img src="${A}${n}.jpg" alt="${alt}">`;
      const cloud = (k, s) => `<svg class="vw-wx" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${k === 'sun' ? '<circle cx="8" cy="8" r="3" class="vw-sun"/>' : ''}${P.cloud}${k === 'cloud' || k === 'sun' ? '' : `<path d="${k}" class="vw-drop"/>`}</svg>`;
      root.innerHTML = `
<nav class="vw-side" aria-label="Main">
  <div class="vw-logo"><svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><path d="M7.5 17.5h11a4.5 4.5 0 0 0 .4-9A6 6 0 0 0 7.3 9.6 4 4 0 0 0 7.5 17.5z" fill="none" stroke="#EDEAE3" stroke-width="2" stroke-linejoin="round"/><path d="M10 21v2M14 21v2M18 21v2" stroke="#F0B35A" stroke-width="2" stroke-linecap="round"/></svg><b>VECTOR</b><span>Weather</span></div>
  ${NAV.map(([k, t, n], i) => `<a class="vw-nav${i ? '' : ' is-on'}" href="#"${i ? '' : ' aria-current="page"'}>${svg(P[k])}${t}${n ? `<span class="vw-count${k === 'alerts' ? ' is-warn' : ''}">${n}</span>` : ''}</a>`).join('')}
  <div class="vw-side-foot">
    <div class="vw-month"><div class="vw-small">Rain this month</div><div class="vw-strong">61 mm of 78 mm usual</div><div class="vw-meter"><span style="width:78%"></span></div></div>
    <div class="vw-me"><span class="vw-av">${img('ines', 'Ines Varga')}</span><div><div class="vw-me-n">Ines Varga</div><div class="vw-small">Kelmore · <span data-unit>°C</span></div></div></div>
  </div>
</nav>
<div class="vw-col">
  <header class="vw-top">
    <label class="vw-search">${svg(P.search, { s: 16, w: 2 })}<span class="vw-sr">Search</span><input type="search" placeholder="Search a city, park or address"></label>
    <button class="vw-place" type="button">${svg(P.places, { s: 15, w: 2 })}Kelmore Harbor<span>· updated 1:52 PM</span></button>
    <div class="vw-top-r">
      <div class="vw-units" role="group" aria-label="Units"><button type="button" aria-pressed="true" data-units="c">°C</button><button type="button" aria-pressed="false" data-units="f">°F</button></div>
      <button class="vw-ib" type="button" aria-label="Reminders" data-bell>${svg(P.bell, { s: 19 })}<span class="vw-badge" aria-hidden="true">1</span></button>
      <span class="vw-av">${img('ines', 'Ines Varga')}</span>
    </div>
  </header>
  <div class="vw-body">
    <main class="vw-main">
      <section class="vw-card vw-now" aria-label="Now">
        <div class="vw-ph">${img('harbor-rain', 'Kelmore Harbor embankment in light rain')}</div>
        <div class="vw-now-b">
          <div class="vw-now-h">
            <div>
              <div class="vw-small">Now · Tue, Nov 25 · 1:52 PM</div>
              <div class="vw-temp"><b>${deg(11)}</b><span>Light rain</span></div>
              <div class="vw-now-sub">On and off until evening · heavier after 3 PM</div>
            </div>
            <div class="vw-now-r">High ${deg(12)} · Low ${deg(6)}<br>Sunset 4:21 PM</div>
          </div>
          <div class="vw-stats">${[['Feels like', deg(8)], ['Wind', '18 km/h SW'], ['Humidity', '88%'], ['Rain by 5 PM', '3.4 mm'], ['UV index', '1 · low']].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>
        </div>
      </section>

      <section class="vw-card vw-rain" aria-label="Rain, next 3 hours">
        <div class="vw-rain-h">
          <div><h2>Rain, next 3 hours</h2><div class="vw-small">mm/h, 5-minute steps · 1:50 – 4:50 PM</div></div>
          <div class="vw-legend"><span><i class="is-light"></i>Light</span><span><i class="is-moderate"></i>Moderate</span><span><i class="is-heavy"></i>Heavy</span></div>
          <button class="vw-find" type="button" data-find>${svg(P.find, { s: 16, w: 2 })}<span data-find-label>Find 30 dry minutes</span></button>
        </div>
        <div class="vw-chart">
          <div class="vw-axis"><span style="top:33px">4</span><span style="top:113px">2</span><span style="top:193px">0</span></div>
          <div class="vw-plot" data-plot>
            <div class="vw-grid" style="top:40px"></div><div class="vw-grid" style="top:120px"></div>
            <div class="vw-gap" data-gap><span data-gap-label></span></div>
            <div class="vw-win" data-win></div>
            <div data-bars></div>
            <div class="vw-base"></div>
            <div class="vw-nowline"></div><div class="vw-nowtag">Now</div>
            <div class="vw-scan" data-scan><span data-scan-label></span></div>
            <div class="vw-chip" data-chip>${svg(P.check, { s: 14, w: 2.4 })}<span data-chip-label></span></div>
          </div>
        </div>
        <div class="vw-ticks"><div></div><div>${['2 PM', '2:30', '3 PM', '3:30', '4 PM', '4:30'].map((t, i) => `<span style="left:${46 + i * 117}px">${t}</span>`).join('')}</div></div>
        <div class="vw-chances"><div class="vw-chances-k">Rain<br>chance</div><div class="vw-cells" data-cells></div></div>
        <div class="vw-foot" aria-live="polite">
          <div class="vw-pane" data-pane="start">${cloud(DROPS3, 18).replace('vw-wx', 'vw-wx is-light')}<span class="vw-foot-t">Rain on and off · <b>3.4 mm</b> expected by 5 PM</span><span class="vw-foot-r">Planning to go out? Ask for a dry half hour.</span></div>
          <div class="vw-pane" data-pane="scan"><i class="vw-pulse"></i><span class="vw-foot-t" data-scan-note></span><span class="vw-foot-r" data-count></span></div>
          <div class="vw-pane" data-pane="result">
            <div class="vw-result"><b data-go></b><span data-go-note></span></div>
            <button class="vw-ghost" type="button" data-share>Share with Sam</button>
            <button class="vw-cta" type="button" data-remind><span class="vw-cta-a">${svg(P.bell, { s: 16, w: 2 })}<span data-remind-label></span></span><span class="vw-cta-b">${svg(P.check, { s: 17, w: 2.4 })}<span data-set-label></span></span></button>
          </div>
          <div class="vw-pane" data-pane="none">${svg(P.info, { s: 18 })}<div class="vw-result is-none"><b data-none></b><span data-none-note></span></div><button class="vw-ghost" type="button">Check next 6 hours</button></div>
        </div>
      </section>

      <div class="vw-row">
        <section class="vw-card vw-hours" aria-label="Next 8 hours">
          <div class="vw-sec-h"><h2>Next 8 hours</h2><a href="#">Hourly</a></div>
          <div class="vw-hours-l">${HOURS.map(([t, temp, p], i) => `<div class="vw-hour${i ? '' : ' is-now'}"><span>${t}</span>${cloud(p >= 80 ? DROPS3 : DROPS2, 24)}<b>${deg(temp)}</b><em>${p}%</em></div>`).join('')}</div>
        </section>
        <section class="vw-card vw-daylight" aria-label="Daylight">
          <div class="vw-ph">${img('dusk', 'Rooftops of Kelmore at dusk')}</div>
          <div class="vw-daylight-b">
            <div class="vw-split"><span class="vw-muted">Daylight left</span><b>2 h 29 min</b></div>
            <div class="vw-meter is-sun"><span style="width:72%"></span></div>
            <div class="vw-split vw-small"><span>Sunrise 7:58</span><span>Sunset 4:21 PM</span></div>
          </div>
        </section>
      </div>
    </main>

    <aside class="vw-aside" aria-label="Your day">
      <section class="vw-card vw-plans" data-plans>
        <div class="vw-sec-h"><h2>Plans today</h2><span class="vw-small">Tue, Nov 25</span></div>
        <div class="vw-plan is-done"><span class="vw-av s">${img('noor', 'Noor Haddad')}</span><div><div class="vw-plan-t">Team call with Noor</div><div class="vw-plan-m">1:00 PM · done</div></div>${svg(P.check, { s: 16, w: 2.2 })}</div>
        <div class="vw-plan is-new" data-plan hidden><span class="vw-plan-i">${svg(P.walk, { s: 17, w: 1.9 })}</span><div><div class="vw-plan-t">Walk · Kelmore Park</div><div class="vw-plan-m" data-plan-time></div></div><span class="vw-plan-r" data-plan-remind></span></div>
        <div class="vw-plan" data-after><span class="vw-av s">${img('sam', 'Sam Okafor')}</span><div><div class="vw-plan-t">Coffee with Sam</div><div class="vw-plan-m">5:30 PM · Ostend Pier</div></div><span class="vw-plan-r is-rain">rain 80%</span></div>
        <div class="vw-plan" data-after><span class="vw-plan-i is-plain">${svg(P.bag, { s: 16 })}</span><div><div class="vw-plan-t">Groceries, Linden St</div><div class="vw-plan-m">7:00 PM</div></div><span class="vw-plan-r">rain 35%</span></div>
      </section>
      <section class="vw-card vw-places" data-after>
        <div class="vw-sec-h"><h2>Places</h2><a href="#">Edit</a></div>
        ${PLACES.map(([n, t, m, temp, alt]) => `<div class="vw-place-r"><span class="vw-ph">${img(n, alt)}</span><div><div class="vw-plan-t is-strong">${t}</div><div class="vw-plan-m">${m}</div></div><b>${deg(temp)}</b></div>`).join('')}
      </section>
      <section class="vw-card vw-days" aria-label="Next 5 days" data-after>
        <div class="vw-sec-h"><h2>Next 5 days</h2><a href="#">10 days</a></div>
        ${DAYS.map(([d, k, p, lo, hi, l, w]) => `<div class="vw-day"><span class="vw-day-n">${d}</span>${cloud(k === 'rain' ? DROPS3 : k, 22)}<span class="vw-day-p">${p}%</span><span class="vw-day-lo">${deg(lo)}</span><span class="vw-range"><span style="left:${l}%;width:${w}%"></span></span><b>${deg(hi)}</b></div>`).join('')}
        <div class="vw-air"><span>Air quality <b>22 · good</b></span><span>Pressure <b>1004 hPa</b></span></div>
      </section>
    </aside>
  </div>
</div>`;
      const $ = s => root.querySelector(s);
      this.el = {
        find: $('[data-find]'), findLabel: $('[data-find-label]'), bars: $('[data-bars]'), cells: $('[data-cells]'),
        gap: $('[data-gap]'), gapLabel: $('[data-gap-label]'), win: $('[data-win]'), scan: $('[data-scan]'), scanLabel: $('[data-scan-label]'),
        chip: $('[data-chip]'), chipLabel: $('[data-chip-label]'), scanNote: $('[data-scan-note]'), count: $('[data-count]'),
        go: $('[data-go]'), goNote: $('[data-go-note]'), remind: $('[data-remind]'), remindLabel: $('[data-remind-label]'), setLabel: $('[data-set-label]'),
        none: $('[data-none]'), noneNote: $('[data-none-note]'), plans: $('[data-plans]'), plan: $('[data-plan]'),
        planTime: $('[data-plan-time]'), planRemind: $('[data-plan-remind]'), after: [...root.querySelectorAll('[data-after]')],
      };
      this.timers = new Set();
      this.el.find.addEventListener('click', () => this.find());
      this.el.remind.addEventListener('click', () => this.remind());
      root.querySelectorAll('[data-units]').forEach(b => b.addEventListener('click', () => this.units(b.dataset.units)));
      root.querySelectorAll('a[href="#"]').forEach(a => a.addEventListener('click', e => e.preventDefault()));
      // buttons give under the finger: real presses and the demo cursor's synthetic pointer events alike
      root.addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (b) b.classList.add('is-press'); });
      const release = () => root.querySelectorAll('.is-press').forEach(b => b.classList.remove('is-press'));
      root.addEventListener('pointerup', release);
      root.addEventListener('pointerleave', release);
      this.reset();
    }

    units(u) {
      if (u !== 'c' && u !== 'f') return;
      this.root.querySelectorAll('[data-units]').forEach(b => b.setAttribute('aria-pressed', b.dataset.units === u));
      this.root.querySelectorAll('[data-c]').forEach(n => { const c = +n.dataset.c; n.textContent = u === 'f' ? Math.round(c * 9 / 5 + 32) : c; });
      this.root.querySelector('[data-unit]').textContent = u === 'f' ? '°F' : '°C';
    }

    later(fn, ms) { const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms); this.timers.add(id); }

    set state(s) { this.root.dataset.state = s; }
    get state() { return this.root.dataset.state; }

    // bars, chance cells and every label come from the forecast, so another forecast gives another answer
    reset(forecast = 'showers') {
      this.timers.forEach(clearTimeout); this.timers.clear();
      this.root.getAnimations({ subtree: true }).forEach(a => a.cancel());
      this.root.classList.remove('is-inserting');
      this.fc = FORECASTS[forecast] || FORECASTS.showers;
      const { el } = this;
      el.bars.innerHTML = this.fc.mm.map((v, i) => `<div class="vw-bar is-${level(v)}" style="left:${(i * PITCH).toFixed(1)}px;--h:${v === 0 ? 4 : Math.max(6, Math.round(v / 4 * 160))}px"></div>`).join('');
      this.bars = [...el.bars.children];
      el.cells.innerHTML = this.fc.chance.map(v => `<div class="vw-cell${v >= 50 ? ' is-high' : ''}">${v}%</div>`).join('');
      this.cells = [...el.cells.children];
      el.findLabel.textContent = 'Find 30 dry minutes';
      el.gap.classList.remove('is-on'); el.chip.classList.remove('is-on');
      el.win.classList.remove('is-on'); el.scan.classList.remove('is-on', 'has-run');
      el.plan.hidden = true;
      this.window = null;
      this.units('c');
      this.state = 'start';
    }

    box(node, from, n) {
      node.style.setProperty('--x', `${from * PITCH - 2}px`);
      node.style.setProperty('--w', `${n * PITCH + (n === NEED ? 0 : 3.5)}px`);
    }

    // walk the steps left to right; the first six dry steps in a row are the walk
    find() {
      if (this.state !== 'start') return;
      const { el, fc } = this, N = fc.mm.length;
      this.state = 'scan';
      el.findLabel.textContent = 'Checking…';
      el.scanNote.textContent = 'Checking 5-minute steps from now';
      el.count.textContent = `0 of ${N} steps`;
      let i = 0, run = 0, best = { n: 0, from: 0 };
      const broke = () => {
        if (run > best.n) best = { n: run, from: i - run };
        for (let k = i - run; k < i; k++) this.bars[k].classList.remove('is-run');
        el.win.classList.remove('is-on');
        this.box(el.gap, i - run, run);
        el.gapLabel.textContent = `${run * 5} min · too short`;
        el.gap.classList.add('is-on');
        el.scanNote.innerHTML = `Checking 5-minute steps from now · <b>${clock(at(i - run))} PM</b> break is only ${run * 5} min`;
      };
      const tick = () => {
        const dry = fc.mm[i] === 0;
        this.bars[i].classList.add('is-checked');
        if (dry) {
          run++;
          this.bars[i].classList.add('is-run');
          this.box(el.win, i - run + 1, run);
          el.win.classList.add('is-on');
        } else if (run) broke();
        if (!dry) run = 0;
        i++;
        el.scan.style.setProperty('--x', `${i * PITCH - 1.5}px`);
        el.scan.classList.add('is-on');
        el.scan.classList.toggle('has-run', run > 0);
        el.scanLabel.textContent = `Dry ${run * 5} of 30 min…`;
        el.count.textContent = `${i} of ${N} steps`;
        if (run === NEED) return this.later(() => this.found(i - NEED), 100);
        if (i === N) { if (run > best.n) best = { n: run, from: i - run }; return this.later(() => this.none(best), 150); }
        this.later(tick, STEP_MS);
      };
      this.later(tick, 80);
    }

    found(from) {
      const { el, fc } = this, to = from + NEED;
      const start = at(from), end = at(to);
      const cells = []; for (let c = Math.floor(from / 2); c <= Math.floor((to - 1) / 2); c++) cells.push(c);
      const chance = cells.map(c => fc.chance[c]);
      const heavy = fc.mm.findIndex((v, k) => k >= to && v > 2.5);
      this.window = { start, end };
      this.bars.forEach((b, k) => b.classList.toggle('is-win', k >= from && k < to));
      this.cells.forEach((c, k) => c.classList.toggle('is-win', cells.includes(k)));
      this.box(el.win, from, NEED);
      el.win.classList.add('is-on');
      el.gap.classList.remove('is-on');
      el.scan.classList.remove('is-on');
      el.chip.style.setProperty('--x', `${from * PITCH - 2 + NEED * PITCH / 2}px`);
      el.chipLabel.textContent = `${clock(start)} – ${clock(end)} PM · dry ${NEED * 5} min`;
      el.findLabel.textContent = `Found · ${clock(start)} PM`;
      el.go.textContent = `Go at ${clock(start)} PM — dry for ${NEED * 5} minutes`;
      el.goNote.textContent = `Rain chance ${Math.min(...chance)}–${Math.max(...chance)}% · rain back at ${clock(end)} PM${heavy > 0 ? `, heavy by ${clock(at(heavy))}` : ''}`;
      el.remindLabel.textContent = `Remind me at ${clock(start - 10)} PM`;
      el.setLabel.textContent = `Reminder set · ${clock(start - 10)} PM`;
      el.chip.classList.add('is-on');
      this.state = 'found';
    }

    none(best) {
      const { el, fc } = this;
      this.bars.forEach(b => b.classList.remove('is-checked', 'is-run'));
      el.win.classList.remove('is-on'); el.scan.classList.remove('is-on');
      this.box(el.gap, best.from, best.n);
      el.gapLabel.textContent = `Longest break · ${best.n * 5} min`;
      el.gap.classList.toggle('is-on', best.n > 0);
      el.findLabel.textContent = 'No dry window';
      el.none.textContent = `No dry ${NEED * 5} minutes before ${clock(at(fc.mm.length))} PM`;
      el.noneNote.textContent = `${best.n ? `Longest break is ${best.n * 5} min at ${clock(at(best.from))} PM. ` : ''}${fc.later}`;
      this.state = 'none';
    }

    // the button turns into "Reminder set", then the walk lands in "Plans today" and pushes the rest down
    remind() {
      if (this.state !== 'found') return;
      const { el } = this, w = this.window;
      this.state = 'set';
      el.planTime.textContent = `${clock(w.start)} – ${clock(w.end)} PM · dry`;
      el.planRemind.textContent = `Remind ${clock(w.start - 10)}`;
      this.later(() => this.addPlan(), PLAN_MS);
    }

    addPlan() {
      const { el, root } = this;
      el.plan.hidden = false;
      const d = el.plan.offsetHeight + parseFloat(getComputedStyle(el.plans).rowGap || 12);
      root.style.setProperty('--vw-shift', `${d}px`);
      root.classList.add('is-inserting');   // the last card keeps its height while it slides, the column clips it
      const o = { duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 520, easing: 'cubic-bezier(.16,1,.3,1)' };
      const runs = [
        ...el.after.map(n => n.animate([{ transform: `translateY(${-d}px)` }, { transform: 'none' }], o)),
        el.plans.animate([{ clipPath: `inset(0 0 ${d}px 0 round 14px)` }, { clipPath: 'inset(0 0 0 0 round 14px)' }], o),
        el.plan.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { ...o, delay: 90, fill: 'backwards' }),
      ];
      Promise.all(runs.map(a => a.finished)).then(() => root.classList.remove('is-inserting'), () => {});
    }
  }

  document.querySelectorAll('.vw').forEach(el => { el.weatherApp = new WeatherApp(el); });
})();
