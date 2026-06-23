/* ============================================
   SOULBITS — APP.JS
   All animations, mouse tracking, theme toggle,
   tab switching, magnetic dock, auth logic
   ============================================ */

(function() {
  'use strict';

  // ============================================
  // 1. INTERACTIVE CONSTELLATION NETWORK (Canvas)
  // ============================================
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;
  let nodes = [];
  const NODE_COUNT = 150;
  const CONNECTION_DIST = 130;
  const MOUSE_RADIUS = 200;

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  class Node {
    constructor() {
      this.x = Math.random() * window.innerWidth;
      this.y = Math.random() * window.innerHeight;
      this.size = Math.random() * 2 + 1;
      this.vx = (Math.random() - 0.5) * 0.25;
      this.vy = (Math.random() - 0.5) * 0.25;
      this.baseOpacity = Math.random() * 0.4 + 0.15;
      this.opacity = this.baseOpacity;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;

      // Wrap around edges
      if (this.x < -20) this.x = window.innerWidth + 20;
      if (this.x > window.innerWidth + 20) this.x = -20;
      if (this.y < -20) this.y = window.innerHeight + 20;
      if (this.y > window.innerHeight + 20) this.y = -20;

      // Gentle ambient drift
      this.vx += (Math.random() - 0.5) * 0.002;
      this.vy += (Math.random() - 0.5) * 0.002;
      this.vx *= 0.995;
      this.vy *= 0.995;
    }
    reactToMouse(mx, my) {
      const dx = this.x - mx;
      const dy = this.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RADIUS) {
        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
        // Gentle push away
        if (dist > 1) {
          this.x += (dx / dist) * force * 2;
          this.y += (dy / dist) * force * 2;
        }
        this.opacity = this.baseOpacity + force * 0.6;
      } else {
        this.opacity += (this.baseOpacity - this.opacity) * 0.03;
      }
    }
  }

  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push(new Node());
  }

  // Mouse Glow DOM element
  const mouseGlow = document.getElementById('mouseGlow');

  // Track mouse
  document.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  });

  // Lerp easing
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    if (isDark) {
      return {
        nodeFill: '200, 195, 220',
        lineStroke: '200, 195, 220',
        nodeOpacityBase: 0.5,
        lineOpacityBase: 0.06,
        glowRadius: 200
      };
    } else {
      return {
        nodeFill: '55, 50, 80',
        lineStroke: '55, 50, 80',
        nodeOpacityBase: 0.55,
        lineOpacityBase: 0.18,
        glowRadius: 200
      };
    }
  }

  // Main animation loop
  function animate() {
    // Smooth mouse follow with lerp
    mouseX = lerp(mouseX, targetX, 0.06);
    mouseY = lerp(mouseY, targetY, 0.06);

    // Update glow DOM element
    if (mouseGlow) {
      mouseGlow.style.transform = `translate(${mouseX - 250}px, ${mouseY - 250}px)`;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const colors = getThemeColors();

    // Update all nodes
    for (const node of nodes) {
      node.update();
      node.reactToMouse(mouseX, mouseY);
    }

    // Draw connections between nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONNECTION_DIST) {
          // Check if near mouse to brighten
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          const mdX = midX - mouseX;
          const mdY = midY - mouseY;
          const mouseDist = Math.sqrt(mdX * mdX + mdY * mdY);

          const distFactor = 1 - dist / CONNECTION_DIST;
          let mouseFactor = 0;
          if (mouseDist < MOUSE_RADIUS) {
            mouseFactor = (1 - mouseDist / MOUSE_RADIUS) * 0.5;
          }

          const opacity = Math.min(distFactor * colors.lineOpacityBase + mouseFactor * 0.3, 0.35);
          if (opacity > 0.005) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${colors.lineStroke}, ${opacity})`;
            ctx.lineWidth = 0.5 + mouseFactor * 1.5;
            ctx.stroke();
          }
        }
      }
    }

    // Draw nodes
    for (const node of nodes) {
      const dx = node.x - mouseX;
      const dy = node.y - mouseY;
      const mouseDist = Math.sqrt(dx * dx + dy * dy);
      let mouseBright = 0;
      if (mouseDist < MOUSE_RADIUS) {
        mouseBright = (1 - mouseDist / MOUSE_RADIUS) * 0.8;
      }
      const finalOpacity = Math.min(node.opacity * colors.nodeOpacityBase + mouseBright * 0.4, 0.8);
      const finalSize = node.size + mouseBright * 2;

      // Outer glow circle for nodes near mouse
      if (mouseBright > 0.1) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, finalSize * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colors.nodeFill}, ${mouseBright * 0.08})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, finalSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${colors.nodeFill}, ${finalOpacity})`;
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  animate();


  // ============================================
  // 2. THEME TOGGLE
  // ============================================
  const themeToggle = document.getElementById('themeToggle');
  const sunIcon = themeToggle.querySelector('.sun-icon');
  const moonIcon = themeToggle.querySelector('.moon-icon');
  const html = document.documentElement;

  function getPreferredTheme() {
    const saved = localStorage.getItem('soulbits-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('soulbits-theme', theme);
    if (theme === 'light') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }

  // Init theme
  setTheme(getPreferredTheme());

  themeToggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!localStorage.getItem('soulbits-theme')) {
      setTheme(e.matches ? 'light' : 'dark');
    }
  });


  // ============================================
  // 3. TAB SWITCHING (Cosmic Dock)
  // ============================================
  const dockBtns = document.querySelectorAll('.dock-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  function switchTab(tabId) {
    // Hide all tabs
    tabContents.forEach(tc => tc.classList.remove('active'));

    // Show target tab
    const target = document.getElementById(`tab-${tabId}`);
    if (target) {
      target.classList.add('active');
    }

    // Update dock buttons
    dockBtns.forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.dock-btn[data-tab="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }

  dockBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });


  // ============================================
  // 4. MAGNETIC DOCK (Fish-eye + Pull)
  // ============================================
  const dockContainer = document.getElementById('dockContainer');
  const dockBtnsAll = dockContainer.querySelectorAll('.dock-btn, .nav-auth-btn');

  dockContainer.addEventListener('mousemove', (e) => {
    const rect = dockContainer.getBoundingClientRect();
    const mouseRelX = e.clientX - rect.left;
    const mouseRelY = e.clientY - rect.top;
    const centerY = rect.height / 2;

    dockBtnsAll.forEach((btn, index) => {
      const btnRect = btn.getBoundingClientRect();
      const btnCenterX = btnRect.left - rect.left + btnRect.width / 2;
      const btnCenterY = btnRect.top - rect.top + btnRect.height / 2;
      const dx = mouseRelX - btnCenterX;
      const dy = mouseRelY - btnCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Magnetic pull
      const pullRadius = 160;
      if (dist < pullRadius) {
        const strength = (1 - dist / pullRadius) * 0.3;
        const moveX = dx * strength;
        const moveY = dy * strength;
        btn.style.transform = `translate(${moveX}px, ${moveY}px)`;
      } else {
        btn.style.transform = 'translate(0, 0)';
      }

      // Fish-eye scaling
      const fishEyeRadius = 200;
      let scale = 1;
      if (dist < fishEyeRadius) {
        const factor = 1 - dist / fishEyeRadius;
        scale = 1 + factor * 0.15;
      }
      btn.style.setProperty('--dock-scale', scale);
      // Apply scale using transform if not being magnetically pulled
      if (dist >= pullRadius) {
        btn.style.transform = `scale(${scale})`;
      } else {
        // Already being translated, combine
        const pullStrength = (1 - dist / pullRadius) * 0.3;
        const moveX = dx * pullStrength;
        const moveY = dy * pullStrength;
        btn.style.transform = `translate(${moveX}px, ${moveY}px) scale(${scale})`;
      }
    });
  });

  dockContainer.addEventListener('mouseleave', () => {
    dockBtnsAll.forEach(btn => {
      btn.style.transform = 'scale(1) translate(0, 0)';
    });
  });


  // ============================================
  // 5. INTERSECTION OBSERVER (Reveal Animations)
  // ============================================
  const revealElements = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => observer.observe(el));


  // ============================================
  // 6. AUTH MODAL
  // ============================================
  const authBtn = document.getElementById('authBtn');
  const authOverlay = document.getElementById('authOverlay');
  const authSignIn = document.getElementById('authSignIn');
  const authSignUp = document.getElementById('authSignUp');

  window.switchAuthState = function(state) {
    if (state === 'signup') {
      authSignIn.style.display = 'none';
      authSignUp.style.display = 'block';
    } else {
      authSignIn.style.display = 'block';
      authSignUp.style.display = 'none';
    }
  };

  authBtn.addEventListener('click', () => {
    authOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  authOverlay.addEventListener('click', (e) => {
    if (e.target === authOverlay) {
      closeAuth();
    }
  });

  function closeAuth() {
    authOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authOverlay.classList.contains('open')) {
      closeAuth();
    }
  });


  // ============================================
  // 7. PASSWORD TOGGLE
  // ============================================
  window.togglePassword = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);

    // Toggle eye icon
    const svg = btn.querySelector('svg');
    if (type === 'text') {
      svg.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
    } else {
      svg.innerHTML = `
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
    }
  };


  // ============================================
  // 8. PRICING TOGGLE (Monthly / Yearly)
  // ============================================
  const pricingToggle = document.getElementById('pricingToggle');
  const toggleLabels = document.querySelectorAll('.toggle-label');

  if (pricingToggle) {
    pricingToggle.addEventListener('click', () => {
      pricingToggle.classList.toggle('yearly');
      const isYearly = pricingToggle.classList.contains('yearly');

      toggleLabels.forEach(label => {
        const period = label.getAttribute('data-period');
        if (isYearly && period === 'yearly') {
          label.classList.add('active');
        } else if (!isYearly && period === 'monthly') {
          label.classList.add('active');
        } else {
          label.classList.remove('active');
        }
      });

      // Update prices
      const priceLight = document.getElementById('price-light');
      if (priceLight) {
        priceLight.textContent = isYearly ? '$0' : '$0';
      }
    });

    toggleLabels.forEach(label => {
      label.addEventListener('click', () => {
        const period = label.getAttribute('data-period');
        if (period === 'yearly') {
          pricingToggle.classList.add('yearly');
        } else {
          pricingToggle.classList.remove('yearly');
        }

        toggleLabels.forEach(l => l.classList.remove('active'));
        label.classList.add('active');

        const priceLight = document.getElementById('price-light');
        if (priceLight) {
          priceLight.textContent = period === 'yearly' ? '$0' : '$0';
        }
      });
    });
  }


  // ============================================
  // 9. MODEL FILTERING (Cloud tab)
  // ============================================
  const modelCatBtns = document.querySelectorAll('.model-cat-btn');
  const modelRows = document.querySelectorAll('.model-row');

  if (modelCatBtns.length > 0) {
    modelCatBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Update active button
        modelCatBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter');

        let visibleCount = 0;
        modelRows.forEach(row => {
          if (filter === 'all') {
            row.style.display = '';
            visibleCount++;
          } else {
            const category = row.getAttribute('data-category');
            if (category === filter) {
              row.style.display = '';
              visibleCount++;
            } else {
              row.style.display = 'none';
            }
          }
        });

        // Update counter
        const counterEl = document.querySelector('.model-counter');
        if (counterEl) {
          counterEl.textContent = `${visibleCount} models`;
        }
      });
    });
  }


  // ============================================
  // 10. RATE LIMIT SELECTOR
  // ============================================
  const ratePills = document.querySelectorAll('.rate-pill');

  ratePills.forEach(pill => {
    pill.addEventListener('click', () => {
      ratePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });


  // ============================================
  // 11. DOC CARD HOVER GLOW (handled by CSS)
  // ============================================

  // ============================================
  // 12. STAR DUST TRAIL (Light Blue Neon Particles)
  // ============================================
  const stardustCanvas = document.getElementById('stardust-canvas');
  const sdCtx = stardustCanvas.getContext('2d');
  let sdParticles = [];

  function resizeStardust() {
    const dpr = window.devicePixelRatio || 1;
    stardustCanvas.width = window.innerWidth * dpr;
    stardustCanvas.height = window.innerHeight * dpr;
    stardustCanvas.style.width = window.innerWidth + 'px';
    stardustCanvas.style.height = window.innerHeight + 'px';
    sdCtx.setTransform(1, 0, 0, 1, 0, 0);
    sdCtx.scale(dpr, dpr);
  }
  resizeStardust();
  window.addEventListener('resize', resizeStardust);

  // Track mouse for stardust (reuse targetX/targetY from main loop)
  let sdMouseX = 0, sdMouseY = 0;
  document.addEventListener('mousemove', (e) => {
    sdMouseX = e.clientX;
    sdMouseY = e.clientY;
  });

  class StarDust {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 3 + 1;
      this.speedX = (Math.random() - 0.5) * 1.2;
      this.speedY = (Math.random() - 0.5) * 1.2 - 0.5; // slight upward drift
      this.life = 1;
      this.decay = Math.random() * 0.015 + 0.008;
      this.sparkle = Math.random() * 0.5 + 0.5;
      this.rotation = Math.random() * Math.PI * 2;
      this.shape = Math.random() > 0.6 ? 'star' : 'circle'; // mix of stars and circles
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.speedX *= 0.98;
      this.speedY *= 0.98;
      this.life -= this.decay;
      this.size *= 0.995;
      this.rotation += 0.02;
    }
    draw(ctx) {
      if (this.life <= 0) return;
      const alpha = this.life * this.sparkle;

      // Determine muted dust color based on theme
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      // Ultra-faded muted lavender-gray — ghost-like, barely visible
      const baseR = 180, baseG = 170, baseB = 195;
      const outerMult = isDark ? 0.12 : 0.06;
      const coreMult = isDark ? 0.25 : 0.12;
      const brightMult = isDark ? 0.18 : 0.08;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      // Outer glow — extremely faint mist
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 5);
      gradient.addColorStop(0, `rgba(${baseR}, ${baseG}, ${baseB}, ${alpha * outerMult})`);
      gradient.addColorStop(0.6, `rgba(${baseR}, ${baseG}, ${baseB}, ${alpha * outerMult * 0.4})`);
      gradient.addColorStop(1, `rgba(${baseR}, ${baseG}, ${baseB}, 0)`);

      ctx.beginPath();
      ctx.arc(0, 0, this.size * 5, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core particle — dusty lavender-slate
      ctx.beginPath();
      if (this.shape === 'star') {
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const r = i % 2 === 0 ? this.size : this.size * 0.4;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      }

      ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${alpha * coreMult})`;
      ctx.fill();

      // Faint inner core
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${alpha * brightMult})`;
      ctx.fill();

      ctx.restore();
    }
  }

  let spawnCounter = 0;
  function animateStardust() {
    sdCtx.clearRect(0, 0, stardustCanvas.width, stardustCanvas.height);

    // Spawn new particles at cursor position
    spawnCounter++;
    const spawnRate = 3; // particles per frame
    if (sdMouseX > 0 && sdMouseY > 0) {
      for (let i = 0; i < spawnRate; i++) {
        const offsetX = (Math.random() - 0.5) * 6;
        const offsetY = (Math.random() - 0.5) * 6;
        sdParticles.push(new StarDust(sdMouseX + offsetX, sdMouseY + offsetY));
      }
    }

    // Update and draw
    for (let i = sdParticles.length - 1; i >= 0; i--) {
      const p = sdParticles[i];
      p.update();
      if (p.life <= 0 || p.size < 0.1) {
        sdParticles.splice(i, 1);
        continue;
      }
      p.draw(sdCtx);
    }

    // Limit particle count
    if (sdParticles.length > 500) {
      sdParticles.splice(0, sdParticles.length - 500);
    }

    requestAnimationFrame(animateStardust);
  }

  animateStardust();


  // ============================================
  // 13. FLUID RIBBON TRAIL CURSOR (Smooth Bezier Snake)
  // ============================================
  const trailCanvas = document.getElementById('cursor-trail-canvas');
  const trailCtx = trailCanvas.getContext('2d');

  function resizeTrailCanvas() {
    const dpr = window.devicePixelRatio || 1;
    trailCanvas.width = window.innerWidth * dpr;
    trailCanvas.height = window.innerHeight * dpr;
    trailCanvas.style.width = window.innerWidth + 'px';
    trailCanvas.style.height = window.innerHeight + 'px';
    trailCtx.setTransform(1, 0, 0, 1, 0, 0);
    trailCtx.scale(dpr, dpr);
  }
  resizeTrailCanvas();
  window.addEventListener('resize', resizeTrailCanvas);

  // Track raw mouse for trail
  let trailMouseX = 0, trailMouseY = 0;
  document.addEventListener('mousemove', (e) => {
    trailMouseX = e.clientX;
    trailMouseY = e.clientY;
  });

  // Single array of trail points (14 points for short snappy ribbon)
  const TRAIL_LENGTH = 14;
  const trail = [];

  // Initialize trail at center of screen
  const initX = window.innerWidth / 2;
  const initY = window.innerHeight / 2;
  for (let i = 0; i < TRAIL_LENGTH; i++) {
    trail.push({ x: initX, y: initY });
  }

  // Easing factor for fluid liquid ribbon physics (higher = snappier)
  const LERP_FACTOR = 0.48;

  function getTrailColors() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    if (isDark) {
      return {
        colors: ['#8f3ba7', '#22318e', '#2d2370'],
        shadowColor: '#8f3ba7',
        shadowBlur: 14
      };
    } else {
      return {
        colors: ['#796ce4', '#5c5be7', '#558af2'],
        shadowColor: '#796ce4',
        shadowBlur: 6
      };
    }
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 143, g: 59, b: 167 };
  }

  // Draw a smooth bezier ribbon through the trail points
  function drawBezierRibbon(points, startIdx, endIdx, lineWidthStart, lineWidthEnd, alpha) {
    if (points.length < 2) return;
    const n = Math.min(endIdx, points.length - 1);

    // Build midpoints for smooth quadratic bezier curves
    // This creates a catmull-rom style smooth interpolation through all points
    trailCtx.globalAlpha = alpha;
    trailCtx.lineCap = 'round';
    trailCtx.lineJoin = 'round';

    // Draw in segments with progressive width tapering
    for (let seg = 0; seg < n - 1; seg++) {
      const i0 = Math.max(0, seg - 1);
      const i1 = seg;
      const i2 = seg + 1;
      const i3 = Math.min(seg + 2, n);

      const p0 = points[i0];
      const p1 = points[i1];
      const p2 = points[i2];
      const p3 = points[i3];

      // Tension factor for smooth curves
      const tension = 0.3;

      // Calculate control points for cubic Bezier (Catmull-Rom to Bezier)
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      // Calculate interpolated width at this segment
      const segRatio = seg / (n - 1);
      const segWidth = lineWidthStart + (lineWidthEnd - lineWidthStart) * segRatio;

      trailCtx.lineWidth = Math.max(segWidth, 0.3);

      trailCtx.beginPath();
      trailCtx.moveTo(p1.x, p1.y);
      trailCtx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      trailCtx.stroke();
    }

    trailCtx.globalAlpha = 1;
  }

  function animateTrail() {
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

    // Point 0 (head) snaps exactly to current mouse coordinates
    trail[0].x += (trailMouseX - trail[0].x) * 1.0;
    trail[0].y += (trailMouseY - trail[0].y) * 1.0;

    // Lerp each subsequent point towards the previous one (fluid physics chain)
    for (let i = 1; i < TRAIL_LENGTH; i++) {
      trail[i].x += (trail[i-1].x - trail[i].x) * LERP_FACTOR;
      trail[i].y += (trail[i-1].y - trail[i].y) * LERP_FACTOR;
    }

    const theme = getTrailColors();
    const color1 = hexToRgb(theme.colors[0]);
    const color2 = hexToRgb(theme.colors[1]);
    const color3 = hexToRgb(theme.colors[2]);

    // --- Layer 1: Outer glow (dark mode neon, light mode subtle) ---
    trailCtx.shadowColor = theme.shadowColor;
    trailCtx.shadowBlur = theme.shadowBlur;

    // Wide faint outer trail
    const outerAlpha = 0.15;
    trailCtx.strokeStyle = `rgba(${color1.r}, ${color1.g}, ${color1.b}, 0.2)`;
    drawBezierRibbon(trail, 0, TRAIL_LENGTH, 8, 0.5, outerAlpha);

    // --- Layer 2: Main colored ribbon with gradient ---
    trailCtx.shadowBlur = theme.shadowBlur * 0.6;

    // Draw in segments with per-segment gradient colors
    trailCtx.lineCap = 'round';
    trailCtx.lineJoin = 'round';

    // Draw segments from head to tail with interpolated colors and tapered width
    for (let seg = 0; seg < TRAIL_LENGTH - 2; seg++) {
      const i0 = Math.max(0, seg - 1);
      const i1 = seg;
      const i2 = seg + 1;
      const i3 = Math.min(seg + 2, TRAIL_LENGTH - 1);

      const p0 = trail[i0];
      const p1 = trail[i1];
      const p2 = trail[i2];
      const p3 = trail[i3];

      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      // Tapered width: thick at head, thin at tail (rapid drop-off)
      const segRatio = seg / (TRAIL_LENGTH - 2);
      const segWidth = 6 * (1 - segRatio * 0.95);
      trailCtx.lineWidth = Math.max(segWidth, 0.3);

      // Interpolate color for this segment
      let r, g, b;
      if (segRatio < 0.5) {
        const t = segRatio / 0.5;
        r = Math.round(color1.r + (color2.r - color1.r) * t);
        g = Math.round(color1.g + (color2.g - color1.g) * t);
        b = Math.round(color1.b + (color2.b - color1.b) * t);
      } else {
        const t = (segRatio - 0.5) / 0.5;
        r = Math.round(color2.r + (color3.r - color2.r) * t);
        g = Math.round(color2.g + (color3.g - color2.g) * t);
        b = Math.round(color2.b + (color3.b - color2.b) * t);
      }

      // Fade alpha towards the tail (quick evaporation)
      const segAlpha = 1 - segRatio * 0.85;

      trailCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${segAlpha})`;
      trailCtx.beginPath();
      trailCtx.moveTo(p1.x, p1.y);
      trailCtx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      trailCtx.stroke();
    }

    // --- Layer 3: Sharp inner core ribbon (bright, thinner) ---
    trailCtx.shadowBlur = 0;
    trailCtx.shadowColor = 'transparent';

    for (let seg = 0; seg < TRAIL_LENGTH - 3; seg++) {
      const i0 = Math.max(0, seg - 1);
      const i1 = seg;
      const i2 = seg + 1;
      const i3 = Math.min(seg + 2, TRAIL_LENGTH - 2);

      const p0 = trail[i0];
      const p1 = trail[i1];
      const p2 = trail[i2];
      const p3 = trail[i3];

      const tension = 0.35;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      const segRatio = seg / (TRAIL_LENGTH - 3);
      const segWidth = 2.5 * (1 - segRatio * 0.92);
      trailCtx.lineWidth = Math.max(segWidth, 0.2);

      const r = Math.round(color1.r + (color2.r - color1.r) * segRatio);
      const g = Math.round(color1.g + (color2.g - color1.g) * segRatio);
      const b = Math.round(color1.b + (color2.b - color1.b) * segRatio);
      const segAlpha = 0.9 - segRatio * 0.85;

      trailCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${segAlpha})`;
      trailCtx.beginPath();
      trailCtx.moveTo(p1.x, p1.y);
      trailCtx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      trailCtx.stroke();
    }

    // Reset shadow
    trailCtx.shadowBlur = 0;
    trailCtx.shadowColor = 'transparent';

    // Draw the core dot at the head
    trailCtx.shadowColor = theme.shadowColor;
    trailCtx.shadowBlur = theme.shadowBlur * 0.8;

    const coreRadius = 3.5;
    const gradient = trailCtx.createRadialGradient(
      trail[0].x, trail[0].y, 0,
      trail[0].x, trail[0].y, coreRadius * 2
    );
    gradient.addColorStop(0, `rgba(${color1.r}, ${color1.g}, ${color1.b}, 1)`);
    gradient.addColorStop(0.6, `rgba(${color1.r}, ${color1.g}, ${color1.b}, 0.8)`);
    gradient.addColorStop(1, `rgba(${color1.r}, ${color1.g}, ${color1.b}, 0)`);

    trailCtx.beginPath();
    trailCtx.arc(trail[0].x, trail[0].y, coreRadius, 0, Math.PI * 2);
    trailCtx.fillStyle = gradient;
    trailCtx.fill();

    trailCtx.shadowBlur = 0;
    trailCtx.shadowColor = 'transparent';

    requestAnimationFrame(animateTrail);
  }

  animateTrail();


  // ============================================
  // 14. "GET STARTED FREE" → OPENS AUTH MODAL
  // ============================================
  const getStartedBtns = document.querySelectorAll('.btn-primary');
  getStartedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      authOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });


  // ============================================
  // 14. ECOSYSTEM TAB SWITCHING (Technology Page)
  // ============================================
  const ecoTabBtns = document.querySelectorAll('.eco-tab-btn');
  const ecoTabPanels = document.querySelectorAll('.eco-tab-panel');

  ecoTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all buttons
      ecoTabBtns.forEach(b => b.classList.remove('active'));
      // Activate clicked button
      btn.classList.add('active');

      // Hide all panels
      const tabId = btn.getAttribute('data-eco-tab');
      ecoTabPanels.forEach(panel => panel.classList.remove('active'));

      // Show target panel
      const targetPanel = document.getElementById(`eco-${tabId}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });


  // ============================================
  // 15. SMOOTH DOCK SCROLL ON MOBILE
  // ============================================
  const cosmicDock = document.getElementById('cosmicDock');
  if (cosmicDock && 'ontouchstart' in window) {
    let isScrolling = false;
    let startX, scrollLeft;

    cosmicDock.addEventListener('touchstart', (e) => {
      isScrolling = true;
      startX = e.touches[0].pageX - cosmicDock.offsetLeft;
      scrollLeft = cosmicDock.scrollLeft;
    });

    cosmicDock.addEventListener('touchmove', (e) => {
      if (!isScrolling) return;
      const x = e.touches[0].pageX - cosmicDock.offsetLeft;
      const walk = (x - startX) * 2;
      cosmicDock.scrollLeft = scrollLeft - walk;
    });

    cosmicDock.addEventListener('touchend', () => {
      isScrolling = false;
    });
  }

})();
