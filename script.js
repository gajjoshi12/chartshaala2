/* ChartShaala — interactions */
(() => {
  'use strict';

  /* ---------- loader ---------- */
  const loader = document.getElementById('loader');
  let loaderHidden = false;
  const hideLoader = () => {
    if (loaderHidden || !loader) return;
    loaderHidden = true;
    loader.classList.add('hide');
    // remove from DOM after the fade so it can never block touches
    setTimeout(() => loader.remove(), 700);
  };
  if (document.readyState === 'complete') {
    setTimeout(hideLoader, 600);
  } else {
    window.addEventListener('load', () => setTimeout(hideLoader, 600), { once: true });
    document.addEventListener('DOMContentLoaded', () => setTimeout(hideLoader, 1200), { once: true });
  }
  // hard fallback — never let the loader stick around past 3.5s
  setTimeout(hideLoader, 3500);

  /* ---------- year ---------- */
  const yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- drawer menu ---------- */
  const menuBtn = document.getElementById('menuBtn');
  const drawer = document.getElementById('drawer');
  const scrim = document.getElementById('drawerScrim');
  const drawerClose = document.getElementById('drawerClose');
  const setDrawer = (open) => {
    drawer.classList.toggle('open', open);
    scrim.classList.toggle('open', open);
    menuBtn.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn?.addEventListener('click', () => setDrawer(!drawer.classList.contains('open')));
  drawerClose?.addEventListener('click', () => setDrawer(false));
  scrim?.addEventListener('click', () => setDrawer(false));
  drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setDrawer(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.section, .hero-card, .chips, .stats-grid, .footer-top')
    .forEach(el => { el.classList.add('reveal'); io.observe(el); });

  /* ---------- count-up stats ---------- */
  const stats = document.querySelectorAll('.stat-num');
  const fmt = (n) => n.toLocaleString('en-IN');
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.count;
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const dur = 1800;
      const start = performance.now();
      const tick = (t) => {
        const p = Math.min((t - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + fmt(Math.floor(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = prefix + fmt(target) + suffix;
      };
      requestAnimationFrame(tick);
      countObs.unobserve(el);
    });
  }, { threshold: 0.4 });
  stats.forEach(el => countObs.observe(el));

  /* ---------- carousel ---------- */
  const makeCarousel = (trackId, prevId, nextId, carouselId) => {
    const track = document.getElementById(trackId);
    if (!track) return;
    const carousel = document.getElementById(carouselId);
    const cards = Array.from(track.children);
    const dots = carousel.querySelectorAll('.dot');
    let idx = 1;
    const render = () => {
      cards.forEach((c, i) => {
        c.classList.remove('active', 'prev', 'next', 'far');
        const d = i - idx;
        if (d === 0) c.classList.add('active');
        else if (d === -1) c.classList.add('prev');
        else if (d === 1) c.classList.add('next');
        else c.classList.add('far');
      });
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    };
    const go = (n) => { idx = (n + cards.length) % cards.length; render(); };
    document.getElementById(prevId)?.addEventListener('click', () => go(idx - 1));
    document.getElementById(nextId)?.addEventListener('click', () => go(idx + 1));
    dots.forEach((d, i) => d.addEventListener('click', () => go(i)));

    // touch swipe
    let sx = 0, dx = 0;
    track.addEventListener('touchstart', e => { sx = e.touches[0].clientX; dx = 0; }, { passive: true });
    track.addEventListener('touchmove',  e => { dx = e.touches[0].clientX - sx; }, { passive: true });
    track.addEventListener('touchend',   () => { if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1)); });

    // autoplay, pause on hover
    let timer = setInterval(() => go(idx + 1), 5000);
    carousel.addEventListener('mouseenter', () => clearInterval(timer));
    carousel.addEventListener('mouseleave', () => timer = setInterval(() => go(idx + 1), 5000));

    render();
  };
  makeCarousel('howTrack', 'howPrev', 'howNext', 'howCarousel');
  makeCarousel('payTrack', 'payPrev', 'payNext', 'payCarousel');

  /* ---------- hero candlestick chart ---------- */
  const canvas = document.getElementById('heroChart');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const N = 36;
    let candles = [];
    let price = 100;
    for (let i = 0; i < N; i++) {
      const open = price;
      const close = open + (Math.random() - 0.48) * 6;
      const high = Math.max(open, close) + Math.random() * 2;
      const low  = Math.min(open, close) - Math.random() * 2;
      candles.push({ open, close, high, low });
      price = close;
    }

    const step = () => {
      const last = candles[candles.length - 1];
      const open = last.close;
      const close = open + (Math.random() - 0.48) * 6;
      const high = Math.max(open, close) + Math.random() * 2;
      const low  = Math.min(open, close) - Math.random() * 2;
      candles.push({ open, close, high, low });
      if (candles.length > N) candles.shift();
    };

    const draw = () => {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      ctx.clearRect(0, 0, w, h);

      const highs = candles.map(c => c.high);
      const lows  = candles.map(c => c.low);
      const max = Math.max(...highs), min = Math.min(...lows);
      const pad = 6;
      const yScale = (v) => pad + (1 - (v - min) / (max - min)) * (h - pad * 2);

      // baseline area
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(34,197,94,.28)');
      grad.addColorStop(1, 'rgba(34,197,94,0)');
      ctx.beginPath();
      candles.forEach((c, i) => {
        const x = (i / (candles.length - 1)) * w;
        const y = yScale(c.close);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      // line
      ctx.beginPath();
      candles.forEach((c, i) => {
        const x = (i / (candles.length - 1)) * w;
        const y = yScale(c.close);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // candles
      const cw = Math.max(2, (w / candles.length) * 0.55);
      candles.forEach((c, i) => {
        const x = (i + 0.5) * (w / candles.length);
        const yO = yScale(c.open);
        const yC = yScale(c.close);
        const yH = yScale(c.high);
        const yL = yScale(c.low);
        const up = c.close >= c.open;
        ctx.strokeStyle = up ? '#22c55e' : '#ef4444';
        ctx.fillStyle   = up ? '#22c55e' : '#ef4444';
        // wick
        ctx.beginPath(); ctx.moveTo(x, yH); ctx.lineTo(x, yL); ctx.lineWidth = 1; ctx.stroke();
        // body
        const top = Math.min(yO, yC);
        const bh = Math.max(1, Math.abs(yC - yO));
        ctx.fillRect(x - cw / 2, top, cw, bh);
      });
    };

    draw();
    let acc = 0;
    const loop = (t) => {
      if (!loop.last) loop.last = t;
      acc += t - loop.last; loop.last = t;
      if (acc > 1200) { step(); draw(); acc = 0; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- smooth anchor offset ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const y = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });
})();
