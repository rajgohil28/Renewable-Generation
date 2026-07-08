/**
 * UIManager — wires the HTML dashboard overlay: staggered entrance,
 * animated counters, toolbar modes, 3D-control toggles, info card,
 * hover tooltip and live data ticking.
 */
import gsap from 'gsap';

const STATS = {
  total: 86.7,
  solar: 26,
  wind: 30.7,
  devices: 128,
  active: 124,
  offline: 4,
};

export class UIManager {
  constructor() {
    this.el = {
      ui: document.getElementById('ui'),
      loader: document.getElementById('loader'),
      loaderFill: document.getElementById('loader-fill'),
      live: document.getElementById('live-panel'),
      toolbar: document.getElementById('toolbar'),
      legend: document.getElementById('legend'),
      controls3d: document.getElementById('controls3d-panel'),
      btn3d: document.getElementById('btn-3d-controls'),
      infocard: document.getElementById('infocard'),
      hovertip: document.getElementById('hovertip'),
      toast: document.getElementById('toast'),
      stats: {
        total: document.getElementById('stat-total'),
        solar: document.getElementById('stat-solar'),
        wind: document.getElementById('stat-wind'),
        devices: document.getElementById('stat-devices'),
        active: document.getElementById('stat-active'),
        offline: document.getElementById('stat-offline'),
      },
    };
    this.callbacks = {};
    this.#bindChrome();
  }

  /** Register scene-side handlers: onTool, onToggle, onFocusRequest. */
  on(callbacks) {
    Object.assign(this.callbacks, callbacks);
  }

  // ── Loading / entrance ──────────────────────────────────────────

  setProgress(v) {
    this.el.loaderFill.style.width = `${Math.round(v * 100)}%`;
  }

  /** Hide loader and play the dashboard entrance choreography. */
  reveal() {
    const l = this.el.loader;
    l.classList.add('is-done');
    gsap.to(l, { opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: () => l.remove() });

    this.el.ui.setAttribute('aria-hidden', 'false');
    const panels = [
      document.querySelector('.topbar'),
      document.getElementById('timeday'),
      this.el.live,
      this.el.toolbar,
      this.el.legend,
    ];
    gsap.from(panels, {
      opacity: 0,
      y: (i) => [-18, 22, 0, 22, 22][i],
      x: (i) => [0, -22, 26, 0, 0][i],
      duration: 0.9,
      stagger: 0.09,
      ease: 'power3.out',
      delay: 0.15,
      clearProps: 'all',
    });

    this.#countUp();
    setTimeout(() => this.toast('<b>●</b>&nbsp; All systems nominal — 124 devices reporting'), 2600);
    this.#startLiveTicker();
  }

  #countUp() {
    const s = this.el.stats;
    const animate = (el, target, decimals = 0) => {
      const state = { v: 0 };
      gsap.to(state, {
        v: target,
        duration: 2.2,
        ease: 'power2.out',
        delay: 0.5,
        onUpdate: () => { el.textContent = state.v.toFixed(decimals); },
      });
    };
    animate(s.total, STATS.total, 1);
    animate(s.solar, STATS.solar, 0);
    animate(s.wind, STATS.wind, 1);
    animate(s.devices, STATS.devices);
    animate(s.active, STATS.active);
    animate(s.offline, STATS.offline);
  }

  /** Gentle live jitter on generation values every few seconds. */
  #startLiveTicker() {
    setInterval(() => {
      const drift = (base, spread, decimals) =>
        (base + (Math.random() - 0.5) * spread).toFixed(decimals);
      const s = this.el.stats;
      gsap.fromTo(s.total, { opacity: 0.45 }, { opacity: 1, duration: 0.6 });
      s.total.textContent = drift(STATS.total, 0.5, 1);
      s.solar.textContent = drift(STATS.solar, 0.4, 0);
      s.wind.textContent = drift(STATS.wind, 0.5, 1);
    }, 4000);
  }

  // ── Chrome: tabs, rail, toolbar, 3D controls ────────────────────

  #bindChrome() {
    // System filter tabs: Solar + Wind / Solar / Wind
    document.querySelectorAll('#top-tabs .tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelector('#top-tabs .is-active')?.classList.remove('is-active');
        tab.classList.add('is-active');
        this.callbacks.onFilter?.(tab.dataset.filter);
      });
    });

    // Time-of-day slider
    const slider = document.getElementById('time-slider');
    const label = document.getElementById('time-label');
    slider.addEventListener('input', () => {
      const h = parseFloat(slider.value);
      const hh = String(Math.floor(h) % 24).padStart(2, '0');
      const mm = String(Math.round((h % 1) * 60)).padStart(2, '0');
      label.textContent = `${hh}:${mm}`;
      this.callbacks.onTime?.(h);
    });

    // Toolbar
    this.el.toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.tool');
      if (!btn) return;
      const tool = btn.dataset.tool;
      if (['select', 'pan', 'rotate'].includes(tool)) {
        this.el.toolbar.querySelectorAll('.tool').forEach((t) => t.classList.remove('is-active'));
        btn.classList.add('is-active');
      }
      this.callbacks.onTool?.(tool);
    });

    // 3D controls popover
    this.el.btn3d.addEventListener('click', () => {
      const open = this.el.controls3d.classList.toggle('is-open');
      this.el.btn3d.classList.toggle('is-open', open);
    });
    for (const id of ['bloom', 'ssao', 'shadows', 'autorotate', 'flow']) {
      document.getElementById(`opt-${id}`).addEventListener('change', (e) => {
        this.callbacks.onToggle?.(id, e.target.checked);
      });
    }

    // Info card
    document.getElementById('ic-close').addEventListener('click', () => this.hideInfoCard());
    document.getElementById('ic-focus').addEventListener('click', () => this.focusHandler?.());
  }

  // ── Info card ───────────────────────────────────────────────────

  showInfoCard(t, onFocus) {
    this.focusHandler = onFocus;
    document.getElementById('ic-type').textContent = t.type;
    document.getElementById('ic-name').textContent = t.name;

    const status = document.getElementById('ic-status');
    status.classList.toggle('is-warn', !!t.warn);
    status.querySelector('span').textContent = t.status;

    const rows = document.getElementById('ic-rows');
    rows.innerHTML = t.rows
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join('');

    // Fake 12h output sparkline
    const spark = document.getElementById('ic-spark');
    spark.innerHTML = Array.from({ length: 16 }, (_, i) => {
      const day = Math.sin((i / 15) * Math.PI); // solar-ish day curve
      const h = Math.max(8, (day * 0.75 + Math.random() * 0.3) * 100);
      return `<i style="height:${h.toFixed(0)}%;animation-delay:${i * 28}ms"></i>`;
    }).join('');

    const card = this.el.infocard;
    card.classList.add('is-open');
    gsap.to(card, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' });
  }

  hideInfoCard() {
    const card = this.el.infocard;
    gsap.to(card, {
      opacity: 0, y: 12, scale: 0.97, duration: 0.3, ease: 'power2.in',
      onComplete: () => card.classList.remove('is-open'),
    });
  }

  // ── Hover tooltip ───────────────────────────────────────────────

  showHoverTip(label, sub, { x, y }) {
    const tip = this.el.hovertip;
    tip.innerHTML = sub ? `${label}<small>${sub}</small>` : label;
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
    tip.classList.add('is-visible');
  }

  hideHoverTip() {
    this.el.hovertip.classList.remove('is-visible');
  }

  // ── Toast ───────────────────────────────────────────────────────

  toast(html, ms = 4200) {
    const t = this.el.toast;
    t.innerHTML = html;
    t.classList.add('is-visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('is-visible'), ms);
  }
}
