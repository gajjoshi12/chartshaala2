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

  /* ---------- scroll-driven carousels ---------- */
  const carousels = [];
  document.querySelectorAll('.scrolly').forEach((scrolly) => {
    const carousel = scrolly.querySelector('.scroll-carousel');
    if (!carousel) return;
    const track = carousel.querySelector('.c-track');
    const cards = Array.from(track.children);
    const dots = carousel.querySelectorAll('.dot');
    if (!cards.length) return;

    const render = (idx) => {
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

    // initial state
    render(0);

    // dot click scrolls the page to that slide's scroll position
    dots.forEach((d, i) => d.addEventListener('click', () => {
      const rect = scrolly.getBoundingClientRect();
      const range = scrolly.offsetHeight - window.innerHeight;
      const targetTop = scrolly.offsetTop + (i / cards.length) * range + 2;
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    }));

    carousels.push({ scrolly, cards, render, lastIdx: -1 });
  });

  const updateCarousels = () => {
    const vh = window.innerHeight;
    carousels.forEach((c) => {
      const rect = c.scrolly.getBoundingClientRect();
      const total = c.scrolly.offsetHeight - vh;
      if (total <= 0) return;
      // progress 0 when top of scrolly hits viewport top, 1 when bottom hits viewport bottom
      const raw = -rect.top / total;
      const progress = Math.max(0, Math.min(0.9999, raw));
      const idx = Math.min(c.cards.length - 1, Math.floor(progress * c.cards.length));
      if (idx !== c.lastIdx) {
        c.lastIdx = idx;
        c.render(idx);
      }
    });
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateCarousels();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateCarousels();

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

  /* ---------- scroll progress bar ---------- */
  const progress = document.getElementById('scrollProgress');
  const updateProgress = () => {
    if (!progress) return;
    const h = document.documentElement;
    const total = h.scrollHeight - h.clientHeight;
    const p = total > 0 ? (h.scrollTop / total) * 100 : 0;
    progress.style.width = p + '%';
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);

  /* ---------- live ticker ---------- */
  const tickerTrack = document.getElementById('tickerTrack');
  if (tickerTrack) {
    const seed = [
      ['NIFTY 50',     21468.22,  1.24],
      ['SENSEX',       71438.09,  0.88],
      ['BANKNIFTY',    48260.55,  1.42],
      ['RELIANCE',      2486.54, -0.58],
      ['TCS',           3902.10,  0.91],
      ['HDFCBANK',      1654.30,  0.44],
      ['INFY',          1412.75, -0.12],
      ['ICICIBANK',     1072.60,  0.72],
      ['SBIN',           772.40,  1.10],
      ['BHARTIARTL',    1286.95,  0.33],
      ['ITC',            443.80, -0.24],
      ['LT',            3587.20,  0.67],
      ['TATASTEEL',      148.20,  2.05],
      ['AXISBANK',      1108.45, -0.18],
      ['ADANIPORTS',    1328.10,  0.92],
      ['BTC/INR',    5672100.00,  2.81],
      ['ETH/INR',     289600.00,  1.47],
      ['USDINR',          83.28, -0.08],
    ];
    const fmtN = (n) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const row = (sym, price, chg) => {
      const up = chg >= 0;
      return `<span class="ticker-item">
        <b>${sym}</b>
        <span class="tv">${fmtN(price)}</span>
        <span class="tc ${up ? 'up' : 'dn'} ${up ? 'arrow-up' : 'arrow-dn'}">${up ? '+' : ''}${chg.toFixed(2)}%</span>
      </span>`;
    };
    // duplicate so the infinite-scroll keyframes loop seamlessly
    const html = seed.map(([s, p, c]) => row(s, p, c)).join('');
    tickerTrack.innerHTML = html + html;

    // tiny live jitter — makes it feel alive
    setInterval(() => {
      const items = tickerTrack.querySelectorAll('.ticker-item');
      items.forEach((el, i) => {
        if (Math.random() > 0.08) return;
        const base = seed[i % seed.length];
        const drift = (Math.random() - 0.48) * 0.05;
        const newChg = base[2] + drift;
        const up = newChg >= 0;
        const tc = el.querySelector('.tc');
        if (tc) {
          tc.className = `tc ${up ? 'up arrow-up' : 'dn arrow-dn'}`;
          tc.textContent = `${up ? '+' : ''}${newChg.toFixed(2)}%`;
        }
      });
    }, 2500);
  }

  /* ---------- FAQ: one open at a time ---------- */
  document.querySelectorAll('.faq-item').forEach((d) => {
    d.addEventListener('toggle', () => {
      if (!d.open) return;
      document.querySelectorAll('.faq-item').forEach((o) => { if (o !== d) o.open = false; });
    });
  });

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
