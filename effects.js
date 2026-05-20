/* gezeceyik — 3D Interactive Effects
 * Inspired by sidewave.it depth & motion design
 * No external dependencies — pure JS + CSS
 */

(function gezeceyikFX() {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  /* ─── CSS INJECTION ────────────────────────────────────────────────── */
  const css = `
    /* Tilt card shine */
    .gfx-shine {
      position: absolute; inset: 0;
      border-radius: inherit;
      background: radial-gradient(
        circle at var(--mx,50%) var(--my,50%),
        rgba(255,255,255,0.2) 0%,
        transparent 55%
      );
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.35s ease;
      z-index: 4;
      mix-blend-mode: overlay;
    }

    /* Scroll-triggered 3D reveal */
    .gfx-reveal {
      opacity: 0;
      transform: perspective(900px) translateY(42px) rotateX(12deg);
      transition:
        opacity 0.8s cubic-bezier(0.4,0,0.2,1),
        transform 0.8s cubic-bezier(0.4,0,0.2,1);
      transform-origin: center top;
    }
    .gfx-reveal.gfx-in {
      opacity: 1;
      transform: perspective(900px) translateY(0) rotateX(0);
    }

    /* Ambient particles canvas */
    .gfx-particles {
      position: fixed; inset: 0;
      pointer-events: none;
      z-index: 3;
      transition: opacity 0.6s ease;
    }
    body.view-tour  .gfx-particles { opacity: 0; }
    body.view-home  .gfx-particles { opacity: 1; }

    /* Map depth layer */
    #world-map-bg,
    #flight-path-svg {
      will-change: transform;
    }

    @media (prefers-reduced-motion: reduce) {
      .gfx-particles { display: none !important; }
      .gfx-reveal { opacity: 1 !important; transform: none !important; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ─── 3D CARD TILT ──────────────────────────────────────────────────── */
  const card = document.getElementById('open-tour-detail');

  if (card && !isTouch) {
    const shine = document.createElement('div');
    shine.className = 'gfx-shine';
    card.style.position = 'relative';
    card.appendChild(shine);

    let tRX = 0, tRY = 0, cRX = 0, cRY = 0;
    let tiltActive = false;
    let insideCard = false;

    card.addEventListener('mousemove', (e) => {
      insideCard = true;
      const r = card.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top)  / r.height;
      tRX = (ny - 0.5) * -5.5;
      tRY = (nx - 0.5) *  5.5;
      shine.style.setProperty('--mx', (nx * 100) + '%');
      shine.style.setProperty('--my', (ny * 100) + '%');
      shine.style.opacity = '0.65';
      if (!tiltActive) { tiltActive = true; animateTilt(); }
    }, { passive: true });

    card.addEventListener('mouseleave', () => {
      insideCard = false;
      tRX = 0; tRY = 0;
      shine.style.opacity = '0';
    });

    function animateTilt() {
      cRX += (tRX - cRX) * 0.10;
      cRY += (tRY - cRY) * 0.10;
      const stillMoving = Math.abs(tRX - cRX) > 0.02 || Math.abs(tRY - cRY) > 0.02;

      if (insideCard || stillMoving) {
        card.style.transform =
          `perspective(1400px) rotateX(${cRX}deg) rotateY(${cRY}deg) translateY(-4px) scale(1.005)`;
        card.style.transition = 'box-shadow 0.55s cubic-bezier(0.4,0,0.2,1)';
        requestAnimationFrame(animateTilt);
      } else {
        card.style.transform = '';
        card.style.transition = 'transform 0.55s cubic-bezier(0.4,0,0.2,1), box-shadow 0.55s cubic-bezier(0.4,0,0.2,1)';
        tiltActive = false;
      }
    }
  }

  /* ─── MOUSE PARALLAX ON MAP — DISABLED ─────────────────────────────── */
  // Background no longer moves with cursor (user request).
  const mapBg     = document.getElementById('world-map-bg');
  const flightSvg = document.getElementById('flight-path-svg');

  /* ─── MAGNETIC BUTTONS ──────────────────────────────────────────────── */
  if (!isTouch) {
    document.querySelectorAll('.btn-reserve.book-button').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width  / 2);
        const dy = e.clientY - (r.top  + r.height / 2);
        btn.style.transform  = `translate(${dx * 0.28}px, ${dy * 0.28 - 2}px)`;
        btn.style.transition = 'transform 0.12s ease, box-shadow 0.4s';
      }, { passive: true });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform  = '';
        btn.style.transition = 'transform 0.55s cubic-bezier(0.4,0,0.2,1), box-shadow 0.4s';
      });
    });
  }

  /* ─── SCROLL-TRIGGERED 3D REVEALS ──────────────────────────────────── */
  const revealTargets = document.querySelectorAll('.contact-hint, .contact-form-inner');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('gfx-in');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });

  revealTargets.forEach((el) => {
    el.classList.add('gfx-reveal');
    revealObs.observe(el);
  });

  /* ─── FLOATING AMBIENT PARTICLES ───────────────────────────────────── */
  const pCanvas = document.createElement('canvas');
  pCanvas.className = 'gfx-particles';
  document.body.appendChild(pCanvas);

  const pCtx = pCanvas.getContext('2d');
  let pW, pH;

  function resizePCanvas() {
    pW = pCanvas.width  = window.innerWidth;
    pH = pCanvas.height = window.innerHeight;
  }
  resizePCanvas();
  window.addEventListener('resize', resizePCanvas, { passive: true });

  const particles = Array.from({ length: 32 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 1.6 + 0.3,
    dx: (Math.random() - 0.5) * 0.22,
    dy: -(Math.random() * 0.32 + 0.06),
    a: Math.random() * 0.28 + 0.08,
  }));

  (function tickParticles() {
    pCtx.clearRect(0, 0, pW, pH);

    if (document.body.classList.contains('view-home')) {
      particles.forEach((p) => {
        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        pCtx.fillStyle = `rgba(15,76,92,${p.a})`;
        pCtx.fill();

        p.x += p.dx;
        p.y += p.dy;

        if (p.y < -10) { p.y = pH + 10; p.x = Math.random() * pW; }
        if (p.x < -10) p.x = pW + 10;
        if (p.x > pW + 10) p.x = -10;
      });
    }

    requestAnimationFrame(tickParticles);
  })();

  /* ─── RESET ON VIEW CHANGE ──────────────────────────────────────────── */
  document.addEventListener('gezeceyik-view', (e) => {
    if (e.detail && e.detail.tour) {
      if (mapBg) mapBg.style.transform = '';
      if (flightSvg) flightSvg.style.transform = '';
      const lmSvg = document.querySelector('.gfx-landmarks');
      if (lmSvg) lmSvg.style.transform = '';
    }
  });

  /* ─── COUNTRY LANDMARKS (Eyfel, Liberty, Pyramid, Fuji, etc.) ──────── */
  (function landmarks() {
    const lmCss = `
      .gfx-landmarks {
        position: fixed; top: 0; left: 0;
        width: 100vw; height: 100vh;
        pointer-events: none;
        z-index: 5;
        overflow: visible;
        transition: opacity 0.5s ease;
      }
      body.view-tour .gfx-landmarks { opacity: 0; }
      body.view-home .gfx-landmarks { opacity: 1; }

      .gfx-landmark {
        opacity: 0;
        animation: lmFadeIn 1.1s ease forwards;
        filter: drop-shadow(0 2px 3px rgba(40, 50, 60, 0.22));
      }
      .gfx-landmark-bob {
        animation: lmBob 4.6s ease-in-out infinite;
      }
      @keyframes lmFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes lmBob {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-4px); }
      }

      /* Cruise ship sailing the oceans */
      .gfx-cruise {
        opacity: 0;
        animation: cruiseFadeIn 1.4s ease 1.6s forwards;
        filter: drop-shadow(0 2px 3px rgba(10, 30, 50, 0.35));
      }
      @keyframes cruiseFadeIn {
        from { opacity: 0; }
        to   { opacity: 0.95; }
      }
      /* Wake foam particles emitted along the ship's path */
      .gfx-wake {
        fill: #ffffff;
        opacity: 0.6;
        animation: wakeFoamFade 3s ease-out forwards;
        pointer-events: none;
      }
      @keyframes wakeFoamFade {
        0%   { opacity: 0.55; }
        40%  { opacity: 0.35; }
        100% { opacity: 0; }
      }

      @media (max-width: 640px) {
        .gfx-landmarks { display: none; }
      }
    `;
    const lmStyle = document.createElement('style');
    lmStyle.textContent = lmCss;
    document.head.appendChild(lmStyle);

    // Realistic detailed icons — viewBox 0 0 22 24
    const ICONS = {
      // Eiffel Tower — iron lattice
      eiffel:
        '<path d="M2 22 Q3 16 7 14 L11 1 L15 14 Q19 16 20 22 Z" fill="#4a4540"/>' +
        '<path d="M11 1 L7 14 L15 14 Z" fill="#5a534a"/>' +
        '<path d="M5 22 Q11 12 17 22" fill="none" stroke="#2a241c" stroke-width="0.6"/>' +
        '<rect x="3" y="14" width="16" height="0.9" fill="#2a241c"/>' +
        '<rect x="6" y="9" width="10" height="0.7" fill="#2a241c"/>' +
        '<rect x="9" y="5" width="4" height="0.5" fill="#2a241c"/>' +
        '<line x1="11" y1="1" x2="11" y2="-0.4" stroke="#2a241c" stroke-width="0.8" stroke-linecap="round"/>',

      // Statue of Liberty — patina copper + pedestal
      liberty:
        '<rect x="5" y="20" width="12" height="3.5" fill="#a89c88"/>' +
        '<rect x="4" y="19" width="14" height="1.1" fill="#7a685a"/>' +
        '<rect x="6" y="17" width="10" height="2" fill="#9c9080"/>' +
        '<path d="M9 9 L8 17 L14 17 L13 9 Z" fill="#8aab9a"/>' +
        '<path d="M8.2 13 H13.8 M8 16 H14" stroke="#5a7a6a" stroke-width="0.4"/>' +
        '<circle cx="11" cy="7.3" r="1.5" fill="#8aab9a"/>' +
        '<path d="M9 5.8 V4 M10 5.6 V3.5 M11 5.5 V3.2 M12 5.6 V3.5 M13 5.8 V4" stroke="#5a7a6a" stroke-width="0.7" stroke-linecap="round"/>' +
        '<path d="M13 9 L15 5.5 L15.4 3.4" fill="none" stroke="#8aab9a" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M15 3.4 Q14.6 1.8 15.5 1 Q15.6 2.2 16.3 1.7 Q15.8 2.8 16.4 3.6 Q15.5 3.2 15 4.2 Z" fill="#f0a050" stroke="#c8704a" stroke-width="0.4"/>' +
        '<rect x="6.5" y="11" width="2.2" height="3" fill="#5a7a6a" fill-opacity="0.7"/>',

      // Colosseum — warm stone arches
      colosseum:
        '<ellipse cx="11" cy="20.5" rx="9.5" ry="2.5" fill="#7a5a3a"/>' +
        '<path d="M2 20.5 V11 Q11 4.5 20 11 V20.5 Z" fill="#c4a07a"/>' +
        '<path d="M2 11 Q11 4.5 20 11" fill="none" stroke="#5a3e22" stroke-width="0.6"/>' +
        '<rect x="2.8" y="14" width="1.6" height="6" fill="#5a3e22"/>' +
        '<rect x="6" y="13" width="1.6" height="7" fill="#5a3e22"/>' +
        '<rect x="9.2" y="12.4" width="1.6" height="7.5" fill="#5a3e22"/>' +
        '<rect x="12.4" y="12.4" width="1.6" height="7.5" fill="#5a3e22"/>' +
        '<rect x="15.6" y="13" width="1.6" height="7" fill="#5a3e22"/>' +
        '<rect x="18.4" y="14" width="1.6" height="6" fill="#5a3e22"/>' +
        '<path d="M3.6 14.6 a0.8 0.8 0 0 1 1.6 0 M6.8 13.6 a0.8 0.8 0 0 1 1.6 0 M10 13 a0.8 0.8 0 0 1 1.6 0 M13.2 13 a0.8 0.8 0 0 1 1.6 0 M16.4 13.6 a0.8 0.8 0 0 1 1.6 0 M19.2 14.6 a0.8 0.8 0 0 1 1.6 0" stroke="#c4a07a" stroke-width="0.6" fill="#c4a07a"/>' +
        '<rect x="3.5" y="9" width="1.3" height="3" fill="#5a3e22"/>' +
        '<rect x="6.5" y="8" width="1.3" height="4" fill="#5a3e22"/>' +
        '<rect x="9.5" y="7.5" width="1.3" height="4.5" fill="#5a3e22"/>' +
        '<rect x="12.2" y="7.5" width="1.3" height="4.5" fill="#5a3e22"/>' +
        '<rect x="15.2" y="8" width="1.3" height="4" fill="#5a3e22"/>' +
        '<rect x="18.2" y="9" width="1.3" height="3" fill="#5a3e22"/>',

      // Pyramid + sphinx silhouette + sand
      pyramid:
        '<rect x="0" y="20" width="22" height="3" fill="#e8c890" fill-opacity="0.5"/>' +
        '<path d="M14 20 L19 11 L22 20 Z" fill="#a07840"/>' +
        '<path d="M2 20 L10 4 L18 20 Z" fill="#d4a974"/>' +
        '<path d="M10 4 L18 20 L10 20 Z" fill="#a07840"/>' +
        '<path d="M2 20 L10 4 L10 20 Z" fill="#e8c890"/>' +
        '<path d="M10 4 L10 20" stroke="#fff" stroke-width="0.4" stroke-opacity="0.35"/>' +
        '<path d="M3 20 Q4 18 5.5 18 Q6 17 7 17.5 L7.5 18 L7.5 20 Z" fill="#8a6438"/>' +
        '<line x1="0" y1="20" x2="22" y2="20" stroke="#8a6438" stroke-width="0.4"/>',

      // Taj Mahal — minarets + dome + reflecting pool
      taj:
        '<rect x="2" y="21.5" width="18" height="2" fill="#a8c8cc" fill-opacity="0.45"/>' +
        '<rect x="2" y="17.5" width="18" height="4" fill="#e8dac0"/>' +
        '<rect x="2" y="16.8" width="18" height="0.9" fill="#a89878"/>' +
        '<rect x="2.6" y="9" width="1.4" height="8" fill="#e8dac0" stroke="#a89878" stroke-width="0.3"/>' +
        '<rect x="5.4" y="9" width="1.4" height="8" fill="#e8dac0" stroke="#a89878" stroke-width="0.3"/>' +
        '<rect x="15.2" y="9" width="1.4" height="8" fill="#e8dac0" stroke="#a89878" stroke-width="0.3"/>' +
        '<rect x="18" y="9" width="1.4" height="8" fill="#e8dac0" stroke="#a89878" stroke-width="0.3"/>' +
        '<circle cx="3.3" cy="8.5" r="0.95" fill="#e8dac0" stroke="#a89878" stroke-width="0.3"/>' +
        '<circle cx="6.1" cy="8.5" r="0.95" fill="#e8dac0" stroke="#a89878" stroke-width="0.3"/>' +
        '<circle cx="15.9" cy="8.5" r="0.95" fill="#e8dac0" stroke="#a89878" stroke-width="0.3"/>' +
        '<circle cx="18.7" cy="8.5" r="0.95" fill="#e8dac0" stroke="#a89878" stroke-width="0.3"/>' +
        '<rect x="7.5" y="11.5" width="7" height="5.5" fill="#e8dac0" stroke="#a89878" stroke-width="0.3"/>' +
        '<path d="M7 11.5 Q7 5.5 11 4 Q15 5.5 15 11.5 Z" fill="#e8dac0" stroke="#a89878" stroke-width="0.5"/>' +
        '<path d="M6 13.5 Q6 11 7.5 10.3 Q9 11 9 13.5 Z" fill="#e8dac0" stroke="#a89878" stroke-width="0.3"/>' +
        '<path d="M13 13.5 Q13 11 14.5 10.3 Q16 11 16 13.5 Z" fill="#e8dac0" stroke="#a89878" stroke-width="0.3"/>' +
        '<line x1="11" y1="4" x2="11" y2="1.8" stroke="#a89878" stroke-width="0.7"/>' +
        '<circle cx="11" cy="1.6" r="0.4" fill="#a89878"/>',

      // Mt. Fuji — snow cap + foreground hints
      fuji:
        '<path d="M0 22 Q3 19 6 22 Z" fill="#5a7280"/>' +
        '<path d="M16 22 Q19 19 22 22 Z" fill="#5a7280"/>' +
        '<path d="M1 22 L9 6 L11 9 L21 22 Z" fill="#6a8090"/>' +
        '<path d="M11 9 L9 6 L9.4 22 L21 22 Z" fill="#3a5060" fill-opacity="0.35"/>' +
        '<path d="M5 12 L9 6 L11 9 L13 12 L10.5 13.6 L8.7 12.6 L6.6 13.6 Z" fill="#f8fafc" stroke="#3a5060" stroke-width="0.4"/>' +
        '<path d="M7 11 L7.5 10 L8 11 L8.6 10.4 L9.2 10.7" fill="none" stroke="#3a5060" stroke-width="0.3"/>' +
        '<circle cx="3" cy="20" r="0.4" fill="#f0a8b8"/>' +
        '<circle cx="4" cy="20.5" r="0.32" fill="#f0a8b8"/>' +
        '<circle cx="18" cy="20.3" r="0.4" fill="#f0a8b8"/>' +
        '<circle cx="19.2" cy="20.7" r="0.32" fill="#f0a8b8"/>',

      // Christ the Redeemer — figure with arms outstretched
      christ:
        '<path d="M5 23 L7 18 L15 18 L17 23 Z" fill="#5a4030" fill-opacity="0.55"/>' +
        '<rect x="8" y="15" width="6" height="3" fill="#8a8478"/>' +
        '<rect x="7.2" y="14.5" width="7.6" height="0.8" fill="#5a503e"/>' +
        '<path d="M10 8 L9 15 L13 15 L12 8 Z" fill="#c8c2b8"/>' +
        '<rect x="3.5" y="8.5" width="15" height="1" fill="#c8c2b8"/>' +
        '<rect x="3" y="8.3" width="0.9" height="1.6" rx="0.3" fill="#c8c2b8"/>' +
        '<rect x="18.1" y="8.3" width="0.9" height="1.6" rx="0.3" fill="#c8c2b8"/>' +
        '<circle cx="11" cy="6" r="1.5" fill="#c8c2b8"/>' +
        '<path d="M10 10 L9.7 15 M12 10 L12.3 15" stroke="#8a8478" stroke-width="0.4"/>',

      // Big Ben — Westminster clock tower
      bigben:
        '<rect x="8" y="22" width="6" height="2" fill="#7a5a3e"/>' +
        '<rect x="7.5" y="20" width="7" height="2" fill="#a08454"/>' +
        '<rect x="8.5" y="8" width="5" height="12" fill="#c4a07a"/>' +
        '<rect x="8.5" y="11" width="5" height="0.6" fill="#7a5a3e"/>' +
        '<rect x="8.5" y="14" width="5" height="0.6" fill="#7a5a3e"/>' +
        '<rect x="8.5" y="17" width="5" height="0.6" fill="#7a5a3e"/>' +
        '<circle cx="11" cy="6.5" r="2.3" fill="#e8dac0" stroke="#5a3e22" stroke-width="0.6"/>' +
        '<circle cx="11" cy="6.5" r="0.25" fill="#2a1a10"/>' +
        '<line x1="11" y1="6.5" x2="11" y2="5" stroke="#2a1a10" stroke-width="0.5" stroke-linecap="round"/>' +
        '<line x1="11" y1="6.5" x2="12.4" y2="6.5" stroke="#2a1a10" stroke-width="0.45" stroke-linecap="round"/>' +
        '<rect x="9.3" y="3.5" width="3.4" height="0.6" fill="#7a5a3e"/>' +
        '<path d="M9.3 3.5 L11 0.6 L12.7 3.5 Z" fill="#a08454" stroke="#5a3e22" stroke-width="0.4"/>' +
        '<line x1="11" y1="0.6" x2="11" y2="-0.6" stroke="#5a3e22" stroke-width="0.5"/>',

      // Saint Basil's Cathedral — Moscow onion domes
      basil:
        '<rect x="2.5" y="20" width="17" height="3.5" fill="#d4b89a"/>' +
        '<rect x="2.5" y="19.5" width="17" height="0.7" fill="#8a6438"/>' +
        '<rect x="4" y="12" width="2.5" height="8" fill="#e8dac0"/>' +
        '<rect x="15.5" y="12" width="2.5" height="8" fill="#e8dac0"/>' +
        '<path d="M3.5 12 Q3.5 8.5 5.25 7.4 Q7 8.5 7 12 Z" fill="#c84020"/>' +
        '<path d="M15 12 Q15 8.5 16.75 7.4 Q18.5 8.5 18.5 12 Z" fill="#4a7a9a"/>' +
        '<path d="M3.8 10 Q5.25 9.4 6.7 10 M15.3 10 Q16.75 9.4 18.2 10" stroke="#fff" stroke-width="0.35" fill="none" stroke-opacity="0.55"/>' +
        '<line x1="5.25" y1="7.4" x2="5.25" y2="6.2" stroke="#8a6438" stroke-width="0.5"/>' +
        '<line x1="16.75" y1="7.4" x2="16.75" y2="6.2" stroke="#8a6438" stroke-width="0.5"/>' +
        '<rect x="7.7" y="14" width="2" height="6" fill="#e8dac0"/>' +
        '<rect x="12.3" y="14" width="2" height="6" fill="#e8dac0"/>' +
        '<path d="M7.2 14 Q7.2 11 8.7 10 Q10.2 11 10.2 14 Z" fill="#e8a050"/>' +
        '<path d="M11.8 14 Q11.8 11 13.3 10 Q14.8 11 14.8 14 Z" fill="#6a5aab"/>' +
        '<path d="M7.5 12.4 Q8.7 11.9 9.9 12.4 M12.1 12.4 Q13.3 11.9 14.5 12.4" stroke="#fff" stroke-width="0.3" fill="none" stroke-opacity="0.55"/>' +
        '<line x1="8.7" y1="10" x2="8.7" y2="8.8" stroke="#8a6438" stroke-width="0.45"/>' +
        '<line x1="13.3" y1="10" x2="13.3" y2="8.8" stroke="#8a6438" stroke-width="0.45"/>' +
        '<rect x="10" y="12" width="2" height="8" fill="#e8dac0"/>' +
        '<path d="M9.4 12 Q9.4 5.5 11 3.5 Q12.6 5.5 12.6 12 Z" fill="#c84020"/>' +
        '<path d="M9.8 8 Q11 7.4 12.2 8" stroke="#fff" stroke-width="0.35" fill="none" stroke-opacity="0.6"/>' +
        '<line x1="11" y1="3.5" x2="11" y2="1" stroke="#8a6438" stroke-width="0.6"/>' +
        '<path d="M10.5 1.5 L11 0.4 L11.5 1.5 Z" fill="#e8c890"/>',

      // Sydney Opera House — white sails
      opera:
        '<rect x="0" y="20.5" width="22" height="3" fill="#5a8aab" fill-opacity="0.45"/>' +
        '<rect x="1" y="19" width="20" height="2" fill="#a89c88"/>' +
        '<rect x="1" y="18.5" width="20" height="0.7" fill="#7a685a"/>' +
        '<path d="M2 19 Q3 8 7 6 L8.5 19 Z" fill="#f4eedf" stroke="#a89878" stroke-width="0.35"/>' +
        '<path d="M5.5 19 Q7 5 11 3.5 L12.5 19 Z" fill="#e8e2d2" stroke="#a89878" stroke-width="0.35"/>' +
        '<path d="M9 19 Q11 5 15 3.5 L16.5 19 Z" fill="#f4eedf" stroke="#a89878" stroke-width="0.35"/>' +
        '<path d="M13 19 Q15 6 19 6 L20 19 Z" fill="#e8e2d2" stroke="#a89878" stroke-width="0.35"/>' +
        '<path d="M3 17 Q5 10 7 8 M6.5 17 Q9 8 11 6 M10 17 Q13 8 15 6 M14 17 Q16.5 9 19 8.5" stroke="#a89878" stroke-width="0.25" fill="none" stroke-opacity="0.55"/>',

      // Chinese Pagoda — multi-tiered temple
      pagoda:
        '<rect x="9" y="22" width="4" height="2" fill="#7a5a3e"/>' +
        '<rect x="7" y="20" width="8" height="2" fill="#a07a4a"/>' +
        '<path d="M5 20 L7 18 H15 L17 20 Q11 18.6 5 20 Z" fill="#c84020"/>' +
        '<path d="M5 20 Q11 19 17 20" fill="none" stroke="#8a3010" stroke-width="0.5"/>' +
        '<rect x="8" y="15.2" width="6" height="3" fill="#e8c890" stroke="#7a5a3e" stroke-width="0.3"/>' +
        '<rect x="8.7" y="15.8" width="1.5" height="2.2" fill="#5a3a20"/>' +
        '<rect x="11.8" y="15.8" width="1.5" height="2.2" fill="#5a3a20"/>' +
        '<path d="M6 15.2 L8 13.5 H14 L16 15.2 Q11 13.9 6 15.2 Z" fill="#c84020"/>' +
        '<path d="M6 15.2 Q11 14.4 16 15.2" fill="none" stroke="#8a3010" stroke-width="0.4"/>' +
        '<rect x="9" y="10.7" width="4" height="2.5" fill="#e8c890" stroke="#7a5a3e" stroke-width="0.3"/>' +
        '<rect x="10.4" y="11.3" width="1.2" height="1.6" fill="#5a3a20"/>' +
        '<path d="M7 10.7 L9 9 H13 L15 10.7 Q11 9.5 7 10.7 Z" fill="#c84020"/>' +
        '<path d="M7 10.7 Q11 9.9 15 10.7" fill="none" stroke="#8a3010" stroke-width="0.4"/>' +
        '<rect x="9.8" y="7" width="2.4" height="1.8" fill="#e8c890" stroke="#7a5a3e" stroke-width="0.3"/>' +
        '<path d="M8 7 L9.5 5.5 H12.5 L14 7 Q11 6.1 8 7 Z" fill="#c84020"/>' +
        '<line x1="11" y1="5.5" x2="11" y2="2" stroke="#a07a4a" stroke-width="0.7"/>' +
        '<circle cx="11" cy="2.2" r="0.55" fill="#e8c890" stroke="#7a5a3e" stroke-width="0.3"/>',

      // Machu Picchu — Andes ruins
      machu:
        '<path d="M0 23 L4 14 L9 9 L13 14 L18 8 L22 23 Z" fill="#7a8a78"/>' +
        '<path d="M9 9 L13 14 L9 23 L4 14 Z" fill="#5a6a58" fill-opacity="0.55"/>' +
        '<path d="M13 14 L18 8 L22 23 L13 23 Z" fill="#9aaa98"/>' +
        '<rect x="5" y="20" width="12" height="1.6" fill="#a89878"/>' +
        '<rect x="6" y="18.4" width="10" height="1.5" fill="#bca888"/>' +
        '<rect x="7.5" y="16.9" width="7" height="1.5" fill="#a89878"/>' +
        '<rect x="9" y="15.4" width="4" height="1.5" fill="#bca888"/>' +
        '<rect x="6.5" y="16.2" width="0.9" height="2.3" fill="#5a4a3a"/>' +
        '<rect x="10.3" y="14.7" width="0.9" height="2.2" fill="#5a4a3a"/>' +
        '<rect x="13.8" y="16.2" width="0.9" height="2.3" fill="#5a4a3a"/>' +
        '<rect x="8" y="19.6" width="0.7" height="1.4" fill="#5a4a3a"/>' +
        '<rect x="13.4" y="19.6" width="0.7" height="1.4" fill="#5a4a3a"/>' +
        '<line x1="0" y1="23" x2="22" y2="23" stroke="#3a4a38" stroke-width="0.3"/>',

      // Chichen Itza — Mayan stepped pyramid
      chichen:
        '<rect x="0" y="22" width="22" height="2" fill="#c8a878" fill-opacity="0.45"/>' +
        '<polygon points="2,22 20,22 18.5,19 3.5,19" fill="#a07a4a"/>' +
        '<polygon points="4,19 18,19 16.5,16 5.5,16" fill="#bc926a"/>' +
        '<polygon points="6,16 16,16 14.5,13 7.5,13" fill="#a07a4a"/>' +
        '<polygon points="8,13 14,13 12.7,10.5 9.3,10.5" fill="#bc926a"/>' +
        '<rect x="9.3" y="6.8" width="3.4" height="3.7" fill="#8a6438"/>' +
        '<rect x="10.4" y="7.8" width="1.2" height="2.7" fill="#3a2010"/>' +
        '<rect x="10.5" y="10.5" width="1" height="11.5" fill="#5a3e22"/>' +
        '<line x1="10.5" y1="13" x2="11.5" y2="13" stroke="#3a2010" stroke-width="0.3"/>' +
        '<line x1="10.5" y1="16" x2="11.5" y2="16" stroke="#3a2010" stroke-width="0.3"/>' +
        '<line x1="10.5" y1="19" x2="11.5" y2="19" stroke="#3a2010" stroke-width="0.3"/>' +
        '<rect x="9.3" y="6.5" width="3.4" height="0.4" fill="#5a3e22"/>',

      // Golden Gate Bridge — red suspension
      goldengate:
        '<rect x="0" y="20" width="22" height="4" fill="#5a8aab" fill-opacity="0.45"/>' +
        '<path d="M0 20 L0 17 L3 15 L3 20 Z" fill="#a8a878" fill-opacity="0.6"/>' +
        '<path d="M19 20 L19 15 L22 17 L22 20 Z" fill="#a8a878" fill-opacity="0.6"/>' +
        '<line x1="0" y1="18" x2="22" y2="18" stroke="#c84020" stroke-width="1.3"/>' +
        '<rect x="4" y="4" width="1.8" height="14" fill="#c84020"/>' +
        '<rect x="16.2" y="4" width="1.8" height="14" fill="#c84020"/>' +
        '<path d="M4 6 L5.8 7 M5.8 6 L4 7 M4 10 L5.8 11 M5.8 10 L4 11 M4 14 L5.8 15 M5.8 14 L4 15" stroke="#8a3010" stroke-width="0.35"/>' +
        '<path d="M16.2 6 L18 7 M18 6 L16.2 7 M16.2 10 L18 11 M18 10 L16.2 11 M16.2 14 L18 15 M18 14 L16.2 15" stroke="#8a3010" stroke-width="0.35"/>' +
        '<path d="M4 6 Q11 14 18 6" fill="none" stroke="#c84020" stroke-width="0.9"/>' +
        '<line x1="6" y1="11" x2="6" y2="18" stroke="#c84020" stroke-width="0.35"/>' +
        '<line x1="8" y1="12.5" x2="8" y2="18" stroke="#c84020" stroke-width="0.35"/>' +
        '<line x1="10" y1="13.4" x2="10" y2="18" stroke="#c84020" stroke-width="0.35"/>' +
        '<line x1="12" y1="13.4" x2="12" y2="18" stroke="#c84020" stroke-width="0.35"/>' +
        '<line x1="14" y1="12.5" x2="14" y2="18" stroke="#c84020" stroke-width="0.35"/>' +
        '<line x1="16" y1="11" x2="16" y2="18" stroke="#c84020" stroke-width="0.35"/>',

      // Burj Khalifa — stepped supertall + Dubai skyline
      burj:
        '<rect x="0" y="22" width="22" height="2" fill="#d4a974" fill-opacity="0.4"/>' +
        '<rect x="3" y="18" width="2" height="4" fill="#a89878"/>' +
        '<rect x="5" y="16" width="2" height="6" fill="#c8b89a"/>' +
        '<rect x="15" y="17" width="2" height="5" fill="#a89878"/>' +
        '<rect x="17" y="19" width="2" height="3" fill="#c8b89a"/>' +
        '<rect x="9.4" y="13" width="3.2" height="9" fill="#a8c0d0"/>' +
        '<rect x="9.7" y="9" width="2.6" height="4" fill="#b8d0e0"/>' +
        '<rect x="10" y="5.5" width="2" height="3.5" fill="#c8d8e8"/>' +
        '<rect x="10.4" y="3" width="1.2" height="2.5" fill="#d8e4f0"/>' +
        '<line x1="11" y1="3" x2="11" y2="0.5" stroke="#5a6a7a" stroke-width="0.6"/>' +
        '<line x1="9.4" y1="15" x2="12.6" y2="15" stroke="#5a8aab" stroke-width="0.22" stroke-opacity="0.6"/>' +
        '<line x1="9.4" y1="17" x2="12.6" y2="17" stroke="#5a8aab" stroke-width="0.22" stroke-opacity="0.6"/>' +
        '<line x1="9.4" y1="19" x2="12.6" y2="19" stroke="#5a8aab" stroke-width="0.22" stroke-opacity="0.6"/>' +
        '<line x1="9.4" y1="21" x2="12.6" y2="21" stroke="#5a8aab" stroke-width="0.22" stroke-opacity="0.6"/>' +
        '<line x1="11" y1="13" x2="11" y2="22" stroke="#5a8aab" stroke-width="0.22" stroke-opacity="0.5"/>',

      // Hassan II Mosque — Moroccan minaret
      hassan:
        '<rect x="2" y="20" width="18" height="3" fill="#d4b88a"/>' +
        '<rect x="2" y="19.6" width="18" height="0.5" fill="#8a6438"/>' +
        '<path d="M3 19.6 Q3.5 17 5 16.5 Q6.5 17 7 19.6 Z" fill="#e8dac0" stroke="#8a6438" stroke-width="0.3"/>' +
        '<path d="M15 19.6 Q15.5 17 17 16.5 Q18.5 17 19 19.6 Z" fill="#e8dac0" stroke="#8a6438" stroke-width="0.3"/>' +
        '<line x1="5" y1="16.5" x2="5" y2="15.2" stroke="#8a6438" stroke-width="0.45"/>' +
        '<line x1="17" y1="16.5" x2="17" y2="15.2" stroke="#8a6438" stroke-width="0.45"/>' +
        '<rect x="9.3" y="5" width="3.4" height="15" fill="#c8a070"/>' +
        '<rect x="9.3" y="8" width="3.4" height="0.45" fill="#8a6438"/>' +
        '<rect x="9.3" y="12" width="3.4" height="0.45" fill="#8a6438"/>' +
        '<rect x="9.3" y="16" width="3.4" height="0.45" fill="#8a6438"/>' +
        '<rect x="10.4" y="9.5" width="1.2" height="2" fill="#5a3a20"/>' +
        '<rect x="10.4" y="13.5" width="1.2" height="2" fill="#5a3a20"/>' +
        '<rect x="10.4" y="17.5" width="1.2" height="2" fill="#5a3a20"/>' +
        '<rect x="8.8" y="4.5" width="4.4" height="0.6" fill="#8a6438"/>' +
        '<rect x="9.6" y="2.2" width="2.8" height="2.5" fill="#c8a070"/>' +
        '<path d="M9.4 2.2 L11 0.2 L12.6 2.2 Z" fill="#8a6438"/>',

      // Mount Kilimanjaro — snow-capped + acacia trees
      kilimanjaro:
        '<rect x="0" y="20.5" width="22" height="2.5" fill="#c89858" fill-opacity="0.45"/>' +
        '<path d="M0 21 L4 17 L8 12 L11 5.5 L14 11 L18 16 L22 21 Z" fill="#6a7a8a"/>' +
        '<path d="M11 5.5 L14 11 L18 16 L22 21 L11 21 Z" fill="#4a5a6a" fill-opacity="0.45"/>' +
        '<path d="M7.2 12 L11 5.5 L14 11 L13 13 L11.4 12.4 L9.6 13 L8 12.7 Z" fill="#f4f8fa" stroke="#3a4a5a" stroke-width="0.35"/>' +
        '<path d="M8.3 13 L8.4 14.4 M10 13 L10.2 14 M11.7 13 L12 14.6" stroke="#f4f8fa" stroke-width="0.55" stroke-linecap="round"/>' +
        '<rect x="2.6" y="17" width="0.4" height="3" fill="#5a4030"/>' +
        '<ellipse cx="2.8" cy="16.4" rx="1.8" ry="0.7" fill="#7a8a4a"/>' +
        '<ellipse cx="3.6" cy="15.7" rx="1.3" ry="0.55" fill="#7a8a4a"/>' +
        '<rect x="18.8" y="17.6" width="0.4" height="2.6" fill="#5a4030"/>' +
        '<ellipse cx="19" cy="17.1" rx="1.4" ry="0.6" fill="#7a8a4a"/>',

      // Table Mountain — flat-top + Cape Town hint
      table:
        '<rect x="0" y="20.5" width="22" height="2.5" fill="#5a8aab" fill-opacity="0.5"/>' +
        '<rect x="0" y="19.3" width="22" height="1.3" fill="#c8b89a"/>' +
        '<rect x="2" y="18.2" width="0.8" height="1.1" fill="#a89878"/>' +
        '<rect x="3.5" y="17.6" width="0.7" height="1.7" fill="#a89878"/>' +
        '<rect x="5" y="18.4" width="0.6" height="0.9" fill="#a89878"/>' +
        '<rect x="17" y="18.1" width="0.7" height="1.2" fill="#a89878"/>' +
        '<rect x="18.5" y="17.8" width="0.6" height="1.5" fill="#a89878"/>' +
        '<path d="M1 19.3 L3 12 L6 7 L18 7 L20 12 L21 19.3 Z" fill="#7a8478"/>' +
        '<rect x="6" y="6" width="12" height="1.2" fill="#5a6458"/>' +
        '<path d="M5 11 L5.5 17 M8 9 L8 18 M11 8 L11 18 M14 8 L14 18 M17 9 L17 17" stroke="#5a6458" stroke-width="0.35" stroke-opacity="0.65"/>' +
        '<line x1="18.5" y1="7.5" x2="20" y2="14" stroke="#3a3a3a" stroke-width="0.25"/>' +
        '<ellipse cx="6" cy="7.3" rx="2.5" ry="0.7" fill="#fff" fill-opacity="0.7"/>' +
        '<ellipse cx="11" cy="7" rx="3" ry="0.75" fill="#fff" fill-opacity="0.7"/>' +
        '<ellipse cx="16" cy="7.3" rx="2.5" ry="0.7" fill="#fff" fill-opacity="0.7"/>',

      // Great Mosque of Djenné — Mali (mud-brick architecture)
      djenne:
        '<rect x="0" y="20" width="22" height="3" fill="#c89858" fill-opacity="0.55"/>' +
        '<rect x="2" y="13" width="18" height="7" fill="#bc8a48"/>' +
        '<rect x="2" y="13" width="18" height="0.55" fill="#7a5028"/>' +
        '<rect x="4" y="7" width="2.5" height="6" fill="#bc8a48"/>' +
        '<rect x="9.75" y="5" width="2.5" height="8" fill="#bc8a48"/>' +
        '<rect x="15.5" y="7" width="2.5" height="6" fill="#bc8a48"/>' +
        '<path d="M4 7 L5.25 5 L6.5 7 Z" fill="#a87038"/>' +
        '<path d="M9.75 5 L11 2.5 L12.25 5 Z" fill="#a87038"/>' +
        '<path d="M15.5 7 L16.75 5 L18 7 Z" fill="#a87038"/>' +
        '<line x1="5.25" y1="5" x2="5.25" y2="3" stroke="#7a5028" stroke-width="0.4"/>' +
        '<line x1="11" y1="2.5" x2="11" y2="0.5" stroke="#7a5028" stroke-width="0.4"/>' +
        '<line x1="16.75" y1="5" x2="16.75" y2="3" stroke="#7a5028" stroke-width="0.4"/>' +
        '<circle cx="5.25" cy="3" r="0.3" fill="#7a5028"/>' +
        '<circle cx="11" cy="0.5" r="0.35" fill="#7a5028"/>' +
        '<circle cx="16.75" cy="3" r="0.3" fill="#7a5028"/>' +
        '<line x1="2" y1="15" x2="0.5" y2="15" stroke="#5a3818" stroke-width="0.45"/>' +
        '<line x1="2" y1="17" x2="0.5" y2="17" stroke="#5a3818" stroke-width="0.45"/>' +
        '<line x1="20" y1="15" x2="21.5" y2="15" stroke="#5a3818" stroke-width="0.45"/>' +
        '<line x1="20" y1="17" x2="21.5" y2="17" stroke="#5a3818" stroke-width="0.45"/>' +
        '<line x1="6.5" y1="11" x2="6.5" y2="9" stroke="#5a3818" stroke-width="0.4"/>' +
        '<line x1="9.75" y1="9" x2="9.75" y2="7" stroke="#5a3818" stroke-width="0.4"/>' +
        '<line x1="12.25" y1="9" x2="12.25" y2="7" stroke="#5a3818" stroke-width="0.4"/>' +
        '<line x1="15.5" y1="11" x2="15.5" y2="9" stroke="#5a3818" stroke-width="0.4"/>' +
        '<rect x="10.2" y="16" width="1.6" height="4" fill="#5a3818"/>' +
        '<rect x="5" y="16" width="0.8" height="1.2" fill="#5a3818"/>' +
        '<rect x="7" y="16" width="0.8" height="1.2" fill="#5a3818"/>' +
        '<rect x="14.2" y="16" width="0.8" height="1.2" fill="#5a3818"/>' +
        '<rect x="16.2" y="16" width="0.8" height="1.2" fill="#5a3818"/>',

      // West African Tribal Mask — Nigeria/Cameroon area
      mask:
        '<rect x="0" y="20" width="22" height="3" fill="#7a8a4a" fill-opacity="0.45"/>' +
        '<line x1="2" y1="20" x2="2" y2="12" stroke="#5a6438" stroke-width="0.4" stroke-opacity="0.5"/>' +
        '<line x1="3" y1="20" x2="3" y2="14" stroke="#5a6438" stroke-width="0.3" stroke-opacity="0.5"/>' +
        '<line x1="19" y1="20" x2="19" y2="12" stroke="#5a6438" stroke-width="0.4" stroke-opacity="0.5"/>' +
        '<line x1="20" y1="20" x2="20" y2="14" stroke="#5a6438" stroke-width="0.3" stroke-opacity="0.5"/>' +
        '<ellipse cx="11" cy="11" rx="4.5" ry="7.8" fill="#8a5028"/>' +
        '<ellipse cx="11" cy="11" rx="4.5" ry="7.8" fill="none" stroke="#3a2010" stroke-width="0.4"/>' +
        '<path d="M9 5 L9.5 2 L11 3.5 L12.5 2 L13 5 Z" fill="#3a2010"/>' +
        '<path d="M9 7 L13 7 M9.5 8 L12.5 8" stroke="#3a2010" stroke-width="0.4" fill="none"/>' +
        '<ellipse cx="9.5" cy="10" rx="0.9" ry="0.4" fill="#f0e8d8"/>' +
        '<ellipse cx="12.5" cy="10" rx="0.9" ry="0.4" fill="#f0e8d8"/>' +
        '<circle cx="9.5" cy="10" r="0.25" fill="#1a0a02"/>' +
        '<circle cx="12.5" cy="10" r="0.25" fill="#1a0a02"/>' +
        '<rect x="10.6" y="11" width="0.8" height="3.5" fill="#3a2010"/>' +
        '<line x1="7.5" y1="12" x2="9" y2="12.5" stroke="#3a2010" stroke-width="0.35"/>' +
        '<line x1="7.5" y1="13" x2="9" y2="13.5" stroke="#3a2010" stroke-width="0.35"/>' +
        '<line x1="13" y1="12.5" x2="14.5" y2="12" stroke="#3a2010" stroke-width="0.35"/>' +
        '<line x1="13" y1="13.5" x2="14.5" y2="13" stroke="#3a2010" stroke-width="0.35"/>' +
        '<rect x="9.5" y="15.5" width="3" height="1.2" fill="#3a2010"/>' +
        '<line x1="10.5" y1="15.5" x2="10.5" y2="16.7" stroke="#8a5028" stroke-width="0.3"/>' +
        '<line x1="11.5" y1="15.5" x2="11.5" y2="16.7" stroke="#8a5028" stroke-width="0.3"/>' +
        '<path d="M10 18 L11 17.5 L12 18 Z" fill="#3a2010"/>',

      // Maasai Warrior — East Africa
      maasai:
        '<rect x="0" y="20" width="22" height="3" fill="#c89858" fill-opacity="0.5"/>' +
        '<rect x="2" y="16" width="0.4" height="4" fill="#5a4030"/>' +
        '<ellipse cx="2.2" cy="15.5" rx="1.8" ry="0.7" fill="#7a8a4a" fill-opacity="0.55"/>' +
        '<circle cx="19" cy="6" r="1.8" fill="#f0a050" fill-opacity="0.5"/>' +
        '<line x1="6.5" y1="1" x2="6" y2="22" stroke="#5a4030" stroke-width="0.6" stroke-linecap="round"/>' +
        '<path d="M6.5 1 L6.15 -0.5 L6.85 -0.5 Z" fill="#7a8898"/>' +
        '<circle cx="11" cy="5" r="1.4" fill="#3a1a10"/>' +
        '<path d="M9.7 4.4 Q11 3 12.3 4.4 Z" fill="#1a0a02"/>' +
        '<circle cx="9.6" cy="5" r="0.25" fill="#d4a850"/>' +
        '<circle cx="12.4" cy="5" r="0.25" fill="#d4a850"/>' +
        '<ellipse cx="11" cy="7.5" rx="1.6" ry="0.5" fill="#f0e8d8" stroke="#a02030" stroke-width="0.35"/>' +
        '<path d="M8.5 8 L8 17 L14 17 L13.5 8 Z" fill="#a02030"/>' +
        '<line x1="8.3" y1="11" x2="13.7" y2="11" stroke="#1a0a02" stroke-width="0.3" stroke-opacity="0.4"/>' +
        '<line x1="8.2" y1="13.5" x2="13.8" y2="13.5" stroke="#1a0a02" stroke-width="0.3" stroke-opacity="0.4"/>' +
        '<line x1="10" y1="8" x2="10" y2="17" stroke="#1a0a02" stroke-width="0.25" stroke-opacity="0.3"/>' +
        '<line x1="12" y1="8" x2="12" y2="17" stroke="#1a0a02" stroke-width="0.25" stroke-opacity="0.3"/>' +
        '<rect x="9.5" y="17" width="1" height="3" fill="#3a1a10"/>' +
        '<rect x="11.5" y="17" width="1" height="3" fill="#3a1a10"/>' +
        '<line x1="7" y1="12" x2="8.5" y2="11" stroke="#3a1a10" stroke-width="0.85" stroke-linecap="round"/>' +
        '<rect x="5.9" y="11.7" width="1.2" height="0.6" fill="#3a1a10"/>',

      // Giraffe — East Africa savanna wildlife
      giraffe:
        '<rect x="0" y="20" width="22" height="3" fill="#c89858" fill-opacity="0.5"/>' +
        '<circle cx="3" cy="5" r="1.7" fill="#f0a050" fill-opacity="0.45"/>' +
        '<rect x="18.5" y="16" width="0.4" height="4" fill="#5a4030"/>' +
        '<ellipse cx="18.7" cy="15.5" rx="1.7" ry="0.7" fill="#7a8a4a" fill-opacity="0.55"/>' +
        '<ellipse cx="11" cy="14" rx="3.5" ry="2" fill="#d4a868"/>' +
        '<rect x="8.2" y="14" width="1" height="6" fill="#d4a868"/>' +
        '<rect x="9.8" y="14" width="1" height="6" fill="#d4a868"/>' +
        '<rect x="11.5" y="14" width="1" height="6" fill="#d4a868"/>' +
        '<rect x="13.2" y="14" width="1" height="6" fill="#d4a868"/>' +
        '<rect x="8.2" y="19.5" width="1" height="0.5" fill="#5a3a20"/>' +
        '<rect x="9.8" y="19.5" width="1" height="0.5" fill="#5a3a20"/>' +
        '<rect x="11.5" y="19.5" width="1" height="0.5" fill="#5a3a20"/>' +
        '<rect x="13.2" y="19.5" width="1" height="0.5" fill="#5a3a20"/>' +
        '<path d="M13.5 13.5 Q14.5 8 13 4 L11.5 4 Q13 8 12 13.5 Z" fill="#d4a868"/>' +
        '<ellipse cx="11.7" cy="3.5" rx="1.5" ry="1.1" fill="#d4a868"/>' +
        '<path d="M10.5 3 L10 2 L10.8 2.5 Z" fill="#d4a868"/>' +
        '<path d="M12.5 3 L13 2 L12.5 2.5 Z" fill="#d4a868"/>' +
        '<rect x="11" y="1.8" width="0.4" height="0.8" fill="#5a3a20"/>' +
        '<rect x="12.2" y="1.8" width="0.4" height="0.8" fill="#5a3a20"/>' +
        '<circle cx="11.2" cy="1.7" r="0.28" fill="#3a2010"/>' +
        '<circle cx="12.4" cy="1.7" r="0.28" fill="#3a2010"/>' +
        '<circle cx="11" cy="3.3" r="0.2" fill="#1a0a02"/>' +
        '<circle cx="9.5" cy="13.5" r="0.5" fill="#7a4828"/>' +
        '<circle cx="11" cy="14" r="0.45" fill="#7a4828"/>' +
        '<circle cx="12.5" cy="13.7" r="0.5" fill="#7a4828"/>' +
        '<circle cx="10.5" cy="15" r="0.4" fill="#7a4828"/>' +
        '<circle cx="12.5" cy="15" r="0.4" fill="#7a4828"/>' +
        '<circle cx="12.5" cy="11" r="0.4" fill="#7a4828"/>' +
        '<circle cx="12.8" cy="9" r="0.35" fill="#7a4828"/>' +
        '<circle cx="12.7" cy="7" r="0.35" fill="#7a4828"/>' +
        '<circle cx="12.3" cy="5.5" r="0.3" fill="#7a4828"/>' +
        '<line x1="7.5" y1="13.5" x2="6.5" y2="15.5" stroke="#d4a868" stroke-width="0.6"/>' +
        '<circle cx="6.5" cy="15.5" r="0.4" fill="#5a3a20"/>' +
        '<rect x="11.7" y="4" width="0.6" height="9" fill="#a87838"/>',

      // Lalibela — Ethiopia rock-cut cross-shaped church
      lalibela:
        '<rect x="0" y="20" width="22" height="3" fill="#a07840" fill-opacity="0.6"/>' +
        '<rect x="0" y="14" width="22" height="6" fill="#7a5a3e"/>' +
        '<rect x="9" y="6" width="4" height="14" fill="#bca888" stroke="#5a3e22" stroke-width="0.45"/>' +
        '<rect x="3" y="11" width="16" height="4" fill="#bca888" stroke="#5a3e22" stroke-width="0.45"/>' +
        '<rect x="9.45" y="11.45" width="3.1" height="3.1" fill="#bca888"/>' +
        '<rect x="3" y="11" width="16" height="0.55" fill="#7a5a3e"/>' +
        '<rect x="9" y="6" width="4" height="0.55" fill="#7a5a3e"/>' +
        '<rect x="10.4" y="16" width="1.2" height="3" fill="#3a2010"/>' +
        '<rect x="4.5" y="12.5" width="1" height="1" fill="#3a2010"/>' +
        '<rect x="16.5" y="12.5" width="1" height="1" fill="#3a2010"/>' +
        '<rect x="10.6" y="2" width="0.8" height="4" fill="#7a5a3e"/>' +
        '<rect x="9.6" y="3" width="2.8" height="0.7" fill="#7a5a3e"/>',

      // Gorilla — Central Africa (DRC / Rwanda / Volcanoes NP)
      gorilla:
        '<rect x="0" y="20" width="22" height="3" fill="#5a7a4a" fill-opacity="0.55"/>' +
        '<rect x="1.5" y="15" width="0.5" height="5" fill="#5a4030"/>' +
        '<ellipse cx="1.75" cy="14.5" rx="1.3" ry="0.7" fill="#4a6238" fill-opacity="0.75"/>' +
        '<rect x="19.5" y="15" width="0.5" height="5" fill="#5a4030"/>' +
        '<ellipse cx="19.75" cy="14.5" rx="1.3" ry="0.7" fill="#4a6238" fill-opacity="0.75"/>' +
        '<ellipse cx="11" cy="17" rx="6" ry="3" fill="#2a221c"/>' +
        '<path d="M5 14 Q5 10 11 9 Q17 10 17 14 L17 17 L5 17 Z" fill="#2a221c"/>' +
        '<path d="M7 11 Q11 9.5 15 11 L15 14 L7 14 Z" fill="#6a605a" fill-opacity="0.65"/>' +
        '<ellipse cx="11" cy="7" rx="2.6" ry="2.2" fill="#2a221c"/>' +
        '<ellipse cx="11" cy="7.5" rx="1.8" ry="1.4" fill="#1a1208"/>' +
        '<circle cx="10.1" cy="7" r="0.28" fill="#e8d8a8"/>' +
        '<circle cx="11.9" cy="7" r="0.28" fill="#e8d8a8"/>' +
        '<ellipse cx="11" cy="8" rx="0.45" ry="0.25" fill="#5a3020"/>' +
        '<ellipse cx="5.5" cy="16.5" rx="2.2" ry="1.5" fill="#1a1208"/>' +
        '<ellipse cx="16.5" cy="16.5" rx="2.2" ry="1.5" fill="#1a1208"/>' +
        '<circle cx="4.5" cy="17.8" r="0.4" fill="#0a0606"/>' +
        '<circle cx="17.5" cy="17.8" r="0.4" fill="#0a0606"/>',

      // African Elephant — Sub-Saharan savanna
      elephant:
        '<rect x="0" y="20" width="22" height="3" fill="#c89858" fill-opacity="0.5"/>' +
        '<circle cx="19" cy="4.5" r="1.6" fill="#f0a050" fill-opacity="0.45"/>' +
        '<rect x="2" y="16" width="0.4" height="4" fill="#5a4030"/>' +
        '<ellipse cx="2.2" cy="15.5" rx="1.8" ry="0.7" fill="#7a8a4a" fill-opacity="0.6"/>' +
        '<ellipse cx="12" cy="14" rx="6" ry="3.5" fill="#7a7268"/>' +
        '<rect x="7" y="14" width="1.7" height="5.5" fill="#7a7268"/>' +
        '<rect x="9" y="14" width="1.7" height="5.5" fill="#7a7268"/>' +
        '<rect x="14" y="14" width="1.7" height="5.5" fill="#7a7268"/>' +
        '<rect x="16" y="14" width="1.7" height="5.5" fill="#7a7268"/>' +
        '<rect x="7" y="19.2" width="1.7" height="0.4" fill="#4a4238"/>' +
        '<rect x="9" y="19.2" width="1.7" height="0.4" fill="#4a4238"/>' +
        '<rect x="14" y="19.2" width="1.7" height="0.4" fill="#4a4238"/>' +
        '<rect x="16" y="19.2" width="1.7" height="0.4" fill="#4a4238"/>' +
        '<ellipse cx="6.5" cy="11.5" rx="2.8" ry="2.5" fill="#7a7268"/>' +
        '<ellipse cx="8" cy="10.5" rx="2.2" ry="2.7" fill="#5a5248"/>' +
        '<ellipse cx="8" cy="10.5" rx="1.7" ry="2.2" fill="#7a7268"/>' +
        '<path d="M4 10.5 Q1.8 13.5 2.5 17.5" fill="none" stroke="#7a7268" stroke-width="1.8" stroke-linecap="round"/>' +
        '<circle cx="5.5" cy="10.8" r="0.28" fill="#1a1408"/>' +
        '<path d="M4.5 12 L2.5 13.5" stroke="#f0e8d8" stroke-width="0.55" stroke-linecap="round"/>' +
        '<line x1="18" y1="13" x2="19.5" y2="15" stroke="#5a5248" stroke-width="0.6" stroke-linecap="round"/>',

      // Baobab Tree — Madagascar / African savanna
      baobab:
        '<rect x="0" y="20" width="22" height="3" fill="#c89858" fill-opacity="0.5"/>' +
        '<circle cx="18" cy="5" r="2.2" fill="#f0a050" fill-opacity="0.55"/>' +
        '<rect x="18.5" y="14" width="0.7" height="6" fill="#5a4030"/>' +
        '<ellipse cx="18.85" cy="13.5" rx="1.5" ry="0.55" fill="#5a6438" fill-opacity="0.7"/>' +
        '<rect x="1.8" y="15" width="0.5" height="5" fill="#5a4030"/>' +
        '<ellipse cx="2.05" cy="14.6" rx="1.2" ry="0.45" fill="#5a6438" fill-opacity="0.7"/>' +
        '<path d="M7 20 L8.2 14 L9 12 L9 8.5 L13 8.5 L13 12 L13.8 14 L15 20 Z" fill="#8a6850"/>' +
        '<path d="M9 12 L13 12" stroke="#5a4030" stroke-width="0.4"/>' +
        '<path d="M8.2 14 L13.8 14" stroke="#5a4030" stroke-width="0.35"/>' +
        '<ellipse cx="11" cy="7.8" rx="3.6" ry="1" fill="#5a6438"/>' +
        '<path d="M10 7.8 L8 5.7 M11 7.4 L11 5.2 M12 7.8 L14 5.7 M9 8 L7 6.3 M13 8 L15 6.3" stroke="#5a4030" stroke-width="0.45" stroke-linecap="round"/>' +
        '<circle cx="8" cy="5.6" r="0.65" fill="#7a8a4a"/>' +
        '<circle cx="11" cy="5.1" r="0.65" fill="#7a8a4a"/>' +
        '<circle cx="14" cy="5.6" r="0.65" fill="#7a8a4a"/>' +
        '<circle cx="7" cy="6.2" r="0.55" fill="#7a8a4a"/>' +
        '<circle cx="15" cy="6.2" r="0.55" fill="#7a8a4a"/>',

      // Canada — Maple leaf + pines + snow
      maple:
        '<rect x="0" y="20" width="22" height="3" fill="#f0f4f6" fill-opacity="0.6"/>' +
        '<ellipse cx="3" cy="20.5" rx="2.2" ry="0.6" fill="#fff"/>' +
        '<ellipse cx="18" cy="20.5" rx="2.2" ry="0.6" fill="#fff"/>' +
        '<path d="M2 19 L3 13 L4 19 Z" fill="#4a5e4a"/>' +
        '<path d="M2.3 17 L3 14 L3.7 17 Z" fill="#3a4e3a"/>' +
        '<rect x="2.85" y="19" width="0.3" height="1" fill="#5a3a20"/>' +
        '<path d="M18 19 L19 13 L20 19 Z" fill="#4a5e4a"/>' +
        '<path d="M18.3 17 L19 14 L19.7 17 Z" fill="#3a4e3a"/>' +
        '<rect x="18.85" y="19" width="0.3" height="1" fill="#5a3a20"/>' +
        '<path d="M11 2.5 L11.9 6 L13.6 5.3 L13 8.2 L15.3 8.2 L13 10.3 L13.9 13 L11.7 12 L11 15 L10.3 12 L8.1 13 L9 10.3 L6.7 8.2 L9 8.2 L8.4 5.3 L10.1 6 Z" fill="#c8202a" stroke="#8a0010" stroke-width="0.45"/>' +
        '<rect x="10.8" y="15" width="0.4" height="3" fill="#5a3a20"/>',

      // Argentina — Obelisco + tango dancers
      obelisk:
        '<rect x="0" y="20" width="22" height="3" fill="#a89878" fill-opacity="0.45"/>' +
        '<line x1="0" y1="21.5" x2="22" y2="21.5" stroke="#7a685a" stroke-width="0.2" stroke-opacity="0.4"/>' +
        '<path d="M9.7 20 L9.9 5 L10.6 3 L11.4 3 L11.1 5 L11.3 20 Z" fill="#e8dac0" stroke="#a89878" stroke-width="0.35"/>' +
        '<path d="M10.6 3 L11.4 3 L11.1 5 L11.3 20 L10.5 20 Z" fill="#a89878" fill-opacity="0.4"/>' +
        '<path d="M10.4 3 L11 1.3 L11.6 3 Z" fill="#a89878"/>' +
        '<rect x="3" y="17" width="0.5" height="3" fill="#2a1810"/>' +
        '<circle cx="3.25" cy="16.4" r="0.45" fill="#2a1810"/>' +
        '<path d="M3.5 17.4 L5 17.4" stroke="#2a1810" stroke-width="0.45" stroke-linecap="round"/>' +
        '<path d="M4.7 17 L4.3 20 L5.7 20 L5.5 17 Z" fill="#a02030"/>' +
        '<circle cx="5" cy="16.5" r="0.4" fill="#2a1810"/>' +
        '<path d="M5.5 19 L6.6 20" stroke="#a02030" stroke-width="0.55" stroke-linecap="round"/>' +
        '<rect x="17" y="17.5" width="0.4" height="2.5" fill="#2a1810"/>' +
        '<circle cx="17.2" cy="17" r="0.4" fill="#2a1810"/>' +
        '<path d="M17.4 18 L18.5 18" stroke="#2a1810" stroke-width="0.4"/>' +
        '<path d="M18.3 17.5 L18 20 L19 20 L18.8 17.5 Z" fill="#a02030"/>' +
        '<circle cx="18.6" cy="17.1" r="0.35" fill="#2a1810"/>',

      // Easter Island — Moai stone head
      moai:
        '<rect x="0" y="20" width="22" height="3" fill="#c89858" fill-opacity="0.45"/>' +
        '<rect x="0" y="22" width="22" height="1" fill="#5a8aab" fill-opacity="0.5"/>' +
        '<path d="M17 20 L17 16 Q17 14 17.5 14 L18.5 14 Q19 14 19 16 V20 Z" fill="#7a6a5a" fill-opacity="0.5"/>' +
        '<rect x="6" y="14" width="10" height="6" fill="#8a7565"/>' +
        '<path d="M7 14 L7 5 Q7.5 2 11 1.5 Q14.5 2 15 5 V14 Z" fill="#8a7565" stroke="#5a4a3a" stroke-width="0.4"/>' +
        '<rect x="7.5" y="6" width="7" height="1" fill="#5a4a3a" fill-opacity="0.55"/>' +
        '<rect x="8.3" y="7.5" width="1.7" height="1.4" fill="#3a2e22"/>' +
        '<rect x="12" y="7.5" width="1.7" height="1.4" fill="#3a2e22"/>' +
        '<path d="M10.4 8.8 L10.7 13 L11.3 13 L11.6 8.8 Z" fill="#5a4a3a"/>' +
        '<rect x="9.7" y="12.5" width="2.6" height="0.5" fill="#5a4a3a"/>' +
        '<path d="M7.5 12 L7 14 L8 14 Z" fill="#5a4a3a" fill-opacity="0.4"/>' +
        '<path d="M14.5 12 L15 14 L14 14 Z" fill="#5a4a3a" fill-opacity="0.4"/>' +
        '<rect x="7" y="9" width="0.4" height="3" fill="#5a4a3a" fill-opacity="0.6"/>' +
        '<rect x="14.6" y="9" width="0.4" height="3" fill="#5a4a3a" fill-opacity="0.6"/>',

      // Mecca — Kaaba cube + pilgrim ring
      mecca:
        '<rect x="0" y="20" width="22" height="3" fill="#d4c8b0" fill-opacity="0.55"/>' +
        '<ellipse cx="11" cy="17" rx="9" ry="2.6" fill="none" stroke="#a89878" stroke-width="0.3"/>' +
        '<circle cx="3" cy="17" r="0.5" fill="#fff" stroke="#7a685a" stroke-width="0.2"/>' +
        '<circle cx="5" cy="18.5" r="0.4" fill="#fff" stroke="#7a685a" stroke-width="0.2"/>' +
        '<circle cx="17" cy="18.5" r="0.4" fill="#fff" stroke="#7a685a" stroke-width="0.2"/>' +
        '<circle cx="19" cy="17" r="0.5" fill="#fff" stroke="#7a685a" stroke-width="0.2"/>' +
        '<circle cx="6" cy="15.5" r="0.4" fill="#fff"/>' +
        '<circle cx="16" cy="15.5" r="0.4" fill="#fff"/>' +
        '<rect x="7" y="9" width="8" height="9" fill="#1a1a1a"/>' +
        '<path d="M15 9 L16.5 8 L16.5 17 L15 18 Z" fill="#0a0a0a"/>' +
        '<path d="M7 9 L8.5 8 L16.5 8 L15 9 Z" fill="#2a2a2a"/>' +
        '<rect x="7" y="11" width="8" height="1" fill="#d4a850"/>' +
        '<path d="M15 11 L16.5 10 L16.5 11 L15 12 Z" fill="#b89040"/>' +
        '<rect x="10.5" y="13.5" width="1.6" height="4.3" fill="#d4a850" stroke="#8a6a20" stroke-width="0.2"/>',

      // Indonesia — Borobudur stepped temple with stupas
      borobudur:
        '<rect x="0" y="20" width="22" height="3" fill="#7a8a5a" fill-opacity="0.45"/>' +
        '<rect x="1" y="17.5" width="20" height="2.5" fill="#a89878"/>' +
        '<rect x="1" y="17" width="20" height="0.55" fill="#7a685a"/>' +
        '<rect x="3" y="14.5" width="16" height="2.5" fill="#bca888"/>' +
        '<rect x="3" y="14" width="16" height="0.55" fill="#7a685a"/>' +
        '<rect x="5" y="11.5" width="12" height="2.5" fill="#a89878"/>' +
        '<rect x="5" y="11" width="12" height="0.55" fill="#7a685a"/>' +
        '<rect x="7" y="9" width="8" height="2.5" fill="#bca888"/>' +
        '<rect x="7" y="8.5" width="8" height="0.55" fill="#7a685a"/>' +
        '<path d="M3.5 14 Q3.5 13 4 12.6 Q4.5 13 4.5 14 Z" fill="#bca888"/>' +
        '<line x1="4" y1="12.6" x2="4" y2="11.9" stroke="#7a685a" stroke-width="0.3"/>' +
        '<path d="M7.5 14 Q7.5 13 8 12.6 Q8.5 13 8.5 14 Z" fill="#bca888"/>' +
        '<line x1="8" y1="12.6" x2="8" y2="11.9" stroke="#7a685a" stroke-width="0.3"/>' +
        '<path d="M13.5 14 Q13.5 13 14 12.6 Q14.5 13 14.5 14 Z" fill="#bca888"/>' +
        '<line x1="14" y1="12.6" x2="14" y2="11.9" stroke="#7a685a" stroke-width="0.3"/>' +
        '<path d="M17.5 14 Q17.5 13 18 12.6 Q18.5 13 18.5 14 Z" fill="#bca888"/>' +
        '<line x1="18" y1="12.6" x2="18" y2="11.9" stroke="#7a685a" stroke-width="0.3"/>' +
        '<path d="M5.5 11 Q5.5 10 6 9.6 Q6.5 10 6.5 11 Z" fill="#a89878"/>' +
        '<path d="M15.5 11 Q15.5 10 16 9.6 Q16.5 10 16.5 11 Z" fill="#a89878"/>' +
        '<path d="M9 8.5 Q9 4 11 3 Q13 4 13 8.5 Z" fill="#bca888" stroke="#7a685a" stroke-width="0.4"/>' +
        '<line x1="11" y1="3" x2="11" y2="1.2" stroke="#7a685a" stroke-width="0.5"/>' +
        '<circle cx="11" cy="1.3" r="0.4" fill="#7a685a"/>',

      // Mongolia — Ger (yurt) + mountains + horse
      ger:
        '<rect x="0" y="20" width="22" height="3" fill="#a8a878" fill-opacity="0.55"/>' +
        '<path d="M0 17 L4 13 L8 14 L12 11 L18 14 L22 16 V20 H0 Z" fill="#6a7a8a" fill-opacity="0.55"/>' +
        '<path d="M0 14 L3 11.5 L4 13 L0 14 Z" fill="#f4f8fa" fill-opacity="0.7"/>' +
        '<path d="M3 14 L11 5 L19 14 Z" fill="#f4f0e8" stroke="#a89878" stroke-width="0.4"/>' +
        '<rect x="4" y="14" width="14" height="6" fill="#fff" stroke="#a89878" stroke-width="0.4"/>' +
        '<path d="M11 5 L6 14 M11 5 L8 14 M11 5 L10 14 M11 5 L12 14 M11 5 L14 14 M11 5 L16 14" stroke="#a89878" stroke-width="0.3"/>' +
        '<rect x="4" y="14" width="14" height="0.6" fill="#a04020"/>' +
        '<rect x="10" y="16" width="2.5" height="4" fill="#a04020" stroke="#5a2010" stroke-width="0.3"/>' +
        '<rect x="11.2" y="16" width="0.2" height="4" fill="#5a2010"/>' +
        '<circle cx="11" cy="5" r="0.85" fill="#f4f0e8" stroke="#a89878" stroke-width="0.35"/>' +
        '<path d="M11 4.5 Q11.5 3.5 11 2.5 Q10.5 1.5 11 0.5" fill="none" stroke="#a89878" stroke-width="0.35" stroke-opacity="0.6"/>',

      // Angkor Wat — Khmer temple with 5 towers
      angkor:
        '<rect x="0" y="21.5" width="22" height="2" fill="#5a8aab" fill-opacity="0.4"/>' +
        '<rect x="1" y="19.2" width="20" height="2.3" fill="#a07a4a"/>' +
        '<rect x="1" y="18.7" width="20" height="0.6" fill="#5a3e22"/>' +
        '<rect x="3" y="15" width="1.8" height="4" fill="#8a6438"/>' +
        '<rect x="6" y="14" width="1.8" height="5" fill="#8a6438"/>' +
        '<rect x="14.2" y="14" width="1.8" height="5" fill="#8a6438"/>' +
        '<rect x="17.2" y="15" width="1.8" height="4" fill="#8a6438"/>' +
        '<path d="M3 15 L3.9 11 L4.8 15 Z" fill="#a07a4a"/>' +
        '<path d="M6 14 L6.9 9.5 L7.8 14 Z" fill="#a07a4a"/>' +
        '<path d="M14.2 14 L15.1 9.5 L16 14 Z" fill="#a07a4a"/>' +
        '<path d="M17.2 15 L18.1 11 L19 15 Z" fill="#a07a4a"/>' +
        '<rect x="5" y="17" width="12" height="2.2" fill="#8a6438"/>' +
        '<rect x="9.4" y="12" width="3.2" height="7" fill="#8a6438"/>' +
        '<path d="M8.8 12 L11 4.5 L13.2 12 Z" fill="#a07a4a"/>' +
        '<line x1="11" y1="4.5" x2="11" y2="2.2" stroke="#5a3e22" stroke-width="0.6"/>' +
        '<circle cx="11" cy="2.3" r="0.4" fill="#5a3e22"/>',
    };

    const POINTS = [
      { icon: 'goldengate', lonlat: [-122.4194, 37.7749], delay: 0.04 },
      { icon: 'maple',      lonlat: [ -95.0000, 55.0000], delay: 0.11 },
      { icon: 'liberty',    lonlat: [ -74.0445, 40.6892], delay: 0.18 },
      { icon: 'chichen',    lonlat: [ -88.5687, 20.6843], delay: 0.25 },
      { icon: 'moai',       lonlat: [-109.3497,-27.1127], delay: 0.32 },
      { icon: 'machu',      lonlat: [ -72.5450,-13.1631], delay: 0.39 },
      { icon: 'christ',     lonlat: [ -43.2105,-22.9519], delay: 0.46 },
      { icon: 'obelisk',    lonlat: [ -58.3816,-34.6037], delay: 0.53 },
      { icon: 'bigben',     lonlat: [  -2.5000, 54.5000], delay: 0.60 },
      { icon: 'eiffel',     lonlat: [   2.3522, 48.8566], delay: 0.67 },
      { icon: 'colosseum',  lonlat: [  12.4922, 41.8902], delay: 0.74 },
      { icon: 'basil',      lonlat: [  37.6231, 55.7525], delay: 0.81 },
      { icon: 'hassan',     lonlat: [  -7.6326, 33.6084], delay: 0.86 },
      { icon: 'djenne',     lonlat: [  -4.5500, 13.9100], delay: 0.89 },
      { icon: 'mask',       lonlat: [   5.0000,  6.0000], delay: 0.92 },
      { icon: 'elephant',   lonlat: [  20.0000,  7.5000], delay: 0.95 },
      { icon: 'pyramid',    lonlat: [  31.1342, 29.9792], delay: 0.98 },
      { icon: 'maasai',     lonlat: [  30.0000,  8.0000], delay: 1.01 },
      { icon: 'lalibela',   lonlat: [  38.7000, 12.0300], delay: 1.04 },
      { icon: 'mecca',      lonlat: [  39.8262, 21.4225], delay: 1.07 },
      { icon: 'gorilla',    lonlat: [  27.5000, -1.5000], delay: 1.10 },
      { icon: 'kilimanjaro',lonlat: [  37.3556, -3.0674], delay: 1.13 },
      { icon: 'giraffe',    lonlat: [  35.0000,-16.0000], delay: 1.16 },
      { icon: 'baobab',     lonlat: [  44.4181,-20.2546], delay: 1.19 },
      { icon: 'table',      lonlat: [  18.4232,-33.9249], delay: 1.22 },
      { icon: 'burj',       lonlat: [  55.2708, 25.2048], delay: 1.30 },
      { icon: 'taj',        lonlat: [  78.0421, 27.1751], delay: 1.37 },
      { icon: 'ger',        lonlat: [ 106.9057, 47.8864], delay: 1.44 },
      { icon: 'angkor',     lonlat: [ 103.8670, 13.4125], delay: 1.51 },
      { icon: 'borobudur',  lonlat: [ 110.2038, -7.6079], delay: 1.58 },
      { icon: 'pagoda',     lonlat: [ 116.4074, 39.9042], delay: 1.65 },
      { icon: 'fuji',       lonlat: [ 138.7274, 35.3606], delay: 1.72 },
      { icon: 'opera',      lonlat: [ 151.2153,-33.8568], delay: 1.79 },
    ];

    const ICON_W = 38, ICON_H = 42;

    // Build the entire SVG via HTML string (guarantees SVG namespace parsing)
    let groupsHtml = '';
    POINTS.forEach((p, idx) => {
      const bobDelay = (Math.random() * 2.5).toFixed(2);
      groupsHtml +=
        '<g class="gfx-landmark" data-key="' + p.icon + '" style="animation-delay:' + p.delay + 's">' +
          '<g class="gfx-landmark-bob" style="animation-delay:' + bobDelay + 's">' +
            '<svg class="gfx-lm-svg" data-idx="' + idx + '" viewBox="0 0 22 24" width="' + ICON_W + '" height="' + ICON_H + '" overflow="visible">' +
              ICONS[p.icon] +
            '</svg>' +
          '</g>' +
        '</g>';
    });

    const fullHtml =
      '<svg class="gfx-landmarks" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
        groupsHtml +
      '</svg>';

    document.body.insertAdjacentHTML('beforeend', fullHtml);

    const rootSvg = document.querySelector('svg.gfx-landmarks');
    if (!rootSvg) return;
    const innerSvgs = rootSvg.querySelectorAll('svg.gfx-lm-svg');

    // Manual Mercator projection (matches the world map's d3.geoMercator config)
    // d3.geoMercator default: φ(lat) = ln(tan(π/4 + lat/2))
    function project(lon, lat, w, h) {
      const scale = w / 6.5;          // matches d3 scale parameter
      const cx = w / 2, cy = h / 2;   // translate([w/2, h/2])
      const centerLat = 20;           // .center([0, 20])
      const lonRad = lon * Math.PI / 180;
      const latRad = lat * Math.PI / 180;
      const centerLatRad = centerLat * Math.PI / 180;
      const x = cx + scale * lonRad;
      const yMerc = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
      const yMercCenter = Math.log(Math.tan(Math.PI / 4 + centerLatRad / 2));
      const y = cy - scale * (yMerc - yMercCenter);
      return [x, y];
    }

    function placeAll() {
      const w = window.innerWidth, h = window.innerHeight;
      rootSvg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      POINTS.forEach((p, idx) => {
        const c = project(p.lonlat[0], p.lonlat[1], w, h);
        const el = innerSvgs[idx];
        if (!el || !c) return;
        el.setAttribute('x', c[0] - ICON_W / 2);
        el.setAttribute('y', c[1] - ICON_H + 2);
      });
    }

    placeAll();

    let lmResize = 0;
    window.addEventListener('resize', () => {
      clearTimeout(lmResize);
      lmResize = setTimeout(placeAll, 160);
    });

    /* ─── CRUISE SHIP SAILING THE WORLD'S OCEANS ─────────────────────── */
    // OCEAN-ONLY route — linear segments between these waypoints stay
    // strictly in water (verified against major coastlines).
    const SHIP_ROUTE = [
      [ -55,  30],  // 0  Mid N Atlantic
      [ -25,   5],  // 1  Tropic Atlantic (well offshore W. Africa)
      [   5, -25],  // 2  South Atlantic
      [  25, -42],  // 3  South of Cape Town
      [  65, -38],  // 4  SW Indian Ocean
      [ 105, -35],  // 5  East Indian Ocean
      [ 130, -42],  // 6  South of Australia
      [ 170, -38],  // 7  Tasman Sea / east of NZ
      [-170, -30],  // 8  South of Polynesia (avoids islands)
      [-140, -15],  // 9  Mid South Pacific
      [-120,   5],  // 10 Equator Pacific
      [-100,  -8],  // 11 Mid Pacific south of equator
      [ -82, -35],  // 12 Off Chile (offshore Pacific)
      [ -78, -55],  // 13 Pacific south (avoids Patagonia land)
      [ -62, -57],  // 14 Cape Horn / Drake Passage
      [ -45, -10]   // 15 Mid S. Atlantic (closing loop)
    ];

    // Ship built with a <g> wrapper (NOT nested <svg>) so rotation works
    // reliably in all browsers. Inner group offsets paths so ship center
    // is at the parent group's origin (0,0).
    const SHIP_SVG =
      '<g class="gfx-cruise" aria-hidden="true">' +
        '<g transform="translate(-20 -7)">' +
          // V-shaped foam wake fan (extends behind stern at left, x<2)
          '<path d="M2 9 L-16 4 L-12 8 L2 9 Z" fill="#ffffff" fill-opacity="0.55"/>' +
          '<path d="M2 10 L-16 15 L-12 11 L2 10 Z" fill="#ffffff" fill-opacity="0.55"/>' +
          '<path d="M-2 9.5 L-14 9.5 L-10 9.5 Z" fill="#ffffff" fill-opacity="0.35"/>' +
          // Hull
          '<path d="M2 8 L3.5 11.5 L33 11.5 L36 8 Z" fill="#1a3a52"/>' +
          // Bow point
          '<path d="M36 8 L39 9.7 L36 11.5 Z" fill="#0a2030"/>' +
          // Hull stripe
          '<rect x="2" y="10" width="34" height="0.4" fill="#0a2030"/>' +
          // Portholes
          '<circle cx="6"  cy="9" r="0.3" fill="#0a2030"/>' +
          '<circle cx="10" cy="9" r="0.3" fill="#0a2030"/>' +
          '<circle cx="14" cy="9" r="0.3" fill="#0a2030"/>' +
          '<circle cx="18" cy="9" r="0.3" fill="#0a2030"/>' +
          '<circle cx="22" cy="9" r="0.3" fill="#0a2030"/>' +
          '<circle cx="26" cy="9" r="0.3" fill="#0a2030"/>' +
          '<circle cx="30" cy="9" r="0.3" fill="#0a2030"/>' +
          // Main deck
          '<rect x="3" y="5" width="33" height="3" fill="#f4f4f4"/>' +
          '<rect x="3" y="5" width="33" height="0.3" fill="#a8a8a8"/>' +
          // Cabin window strip
          '<rect x="4"  y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          '<rect x="6"  y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          '<rect x="8"  y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          '<rect x="10" y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          '<rect x="12" y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          '<rect x="14" y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          '<rect x="16" y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          '<rect x="18" y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          '<rect x="20" y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          '<rect x="22" y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          '<rect x="24" y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          '<rect x="26" y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          '<rect x="28" y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          '<rect x="30" y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          '<rect x="32" y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          '<rect x="34" y="6" width="0.7" height="0.7" fill="#5a8aab"/>' +
          // Upper deck
          '<rect x="6" y="3" width="24" height="2" fill="#f4f4f4"/>' +
          // Bridge
          '<rect x="26" y="1.5" width="5" height="1.5" fill="#f4f4f4"/>' +
          '<rect x="26.5" y="2" width="4" height="0.7" fill="#1a3a52"/>' +
          // Funnels with black bands
          '<rect x="11" y="0.5" width="1.8" height="2.5" fill="#c84020"/>' +
          '<rect x="11" y="0.5" width="1.8" height="0.4" fill="#1a1a1a"/>' +
          '<rect x="16" y="0.5" width="1.8" height="2.5" fill="#c84020"/>' +
          '<rect x="16" y="0.5" width="1.8" height="0.4" fill="#1a1a1a"/>' +
          // Mast + flag
          '<line x1="30" y1="3" x2="30" y2="0.3" stroke="#5a5048" stroke-width="0.3"/>' +
          '<path d="M30 0.3 L32 0.9 L30 1.5 Z" fill="#c84020"/>' +
        '</g>' +
      '</g>';

    rootSvg.insertAdjacentHTML('beforeend', SHIP_SVG);
    const shipGroup = rootSvg.querySelector('.gfx-cruise');

    // Wrap longitude to [-180, 180]
    function wrapLon(lon) {
      let l = ((lon + 540) % 360) - 180;
      if (l <= -180) l += 360;
      return l;
    }

    // Ports where the ship docks for a few seconds before continuing
    const PORT_INDICES = [3, 7, 9, 14]; // Cape Town · NZ · Tahiti · Cape Horn area
    const PORT_DURATION_FRAMES = 240;    // ~4 seconds at 60fps

    let shipProgress = 0;
    const SHIP_SPEED = 0.0008;
    const SHIP_N = SHIP_ROUTE.length;
    let prevX = null, prevY = null;
    let lastTilt = 0;
    let lastFlip = 1;
    let wakeFrame = 0;
    let portPauseFrames = 0;
    let lastIdx = -1;

    function tickShip() {
      if (!document.body.classList.contains('view-home')) {
        requestAnimationFrame(tickShip);
        return;
      }

      const docked = portPauseFrames > 0;
      if (docked) {
        portPauseFrames--;
      } else {
        shipProgress = (shipProgress + SHIP_SPEED) % SHIP_N;
        const newIdx = Math.floor(shipProgress);
        if (newIdx !== lastIdx) {
          lastIdx = newIdx;
          if (PORT_INDICES.indexOf(newIdx) >= 0) {
            shipProgress = newIdx;
            portPauseFrames = PORT_DURATION_FRAMES;
          }
        }
      }

      const idx = Math.floor(shipProgress);
      const t = shipProgress - idx;

      const w = window.innerWidth, h = window.innerHeight;
      const i1 = idx % SHIP_N;
      const i2 = (idx + 1) % SHIP_N;
      const wp1 = SHIP_ROUTE[i1];
      const wp2 = SHIP_ROUTE[i2];

      // Linear interpolation in geographic coords with DATELINE handling.
      // If two adjacent waypoints span the dateline (|Δlon| > 180), unwrap
      // so the path goes the short way around (e.g. 170° → 190° → wraps to -170°).
      let lon1 = wp1[0];
      let lon2 = wp2[0];
      if (Math.abs(lon2 - lon1) > 180) {
        if (lon1 > lon2) lon2 += 360; // e.g., 170 → -170: lon2 becomes 190
        else             lon1 += 360; // e.g., -170 → 170: lon1 becomes 190
      }
      const lonI = wrapLon(lon1 + t * (lon2 - lon1));
      const latI = wp1[1] + t * (wp2[1] - wp1[1]);

      const proj = project(lonI, latI, w, h);
      if (!proj) { requestAnimationFrame(tickShip); return; }
      const x = proj[0];
      const y = proj[1];

      // Ship orientation: scaleX flip for left/right + capped tilt for up/down.
      // This avoids the upside-down problem of rotating a side-view ship 180°.
      let flip = lastFlip;
      let tiltTarget = 0;
      if (!docked && prevX !== null) {
        const mdx = x - prevX;
        const mdy = y - prevY;
        const motMag = Math.sqrt(mdx * mdx + mdy * mdy);
        if (motMag > 0.05) {
          // Update facing direction only on meaningful horizontal motion
          if (Math.abs(mdx) > 0.1) {
            flip = (mdx >= 0) ? 1 : -1;
          }
          // Tilt = vertical component relative to horizontal magnitude
          let screenTilt = Math.atan2(mdy, Math.abs(mdx)) * 180 / Math.PI;
          if (screenTilt >  35) screenTilt =  35;
          if (screenTilt < -35) screenTilt = -35;
          // After scaleX(flip), rotation direction reverses → multiply by flip
          tiltTarget = screenTilt * flip;
        }
      }
      lastFlip = flip;

      // Smooth lerp for tilt (avoid jitter)
      let tiltDiff = tiltTarget - lastTilt;
      lastTilt += tiltDiff * 0.20;

      shipGroup.setAttribute('transform',
        'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') rotate(' +
        lastTilt.toFixed(1) + ') scale(' + flip + ',1)');

      // Wake foam — only when actually moving
      if (!docked) {
        wakeFrame++;
        if (wakeFrame >= 5 && prevX !== null) {
          wakeFrame = 0;
          emitWake(x, y);
        }
      } else {
        wakeFrame = 0;
      }

      prevX = x;
      prevY = y;
      requestAnimationFrame(tickShip);
    }

    function emitWake(x, y) {
      const w = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      w.setAttribute('cx', x.toFixed(1));
      w.setAttribute('cy', y.toFixed(1));
      w.setAttribute('r', (1.4 + Math.random() * 1.4).toFixed(2));
      w.setAttribute('class', 'gfx-wake');
      rootSvg.insertBefore(w, shipGroup);
      setTimeout(() => { w.parentNode && w.parentNode.removeChild(w); }, 3000);
    }

    tickShip();
  })();

})();
