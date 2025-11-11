// Smooth-scroll anchors
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const el = document.querySelector(id);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Copy-to-clipboard for donation wallet
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('#copyBtn');
  if(!btn) return;
  const id = btn.dataset.copy;
  const el = document.getElementById(id);
  if(!el) return;
  const text = el.textContent.trim();
  navigator.clipboard.writeText(text).then(()=>{
    const prev = btn.textContent;
    btn.textContent = 'Copied ✔';
    setTimeout(()=> btn.textContent = prev, 900);
  });
});

// Swap logo to assets/logo.png if present; hide images if missing
document.addEventListener('DOMContentLoaded', () => {
  // Try to use a custom PNG logo if available
  const brandLogo = document.querySelector('.logo');
  if (brandLogo) {
    const testImg = new Image();
    testImg.onload = () => { brandLogo.src = 'assets/logo.png'; };
    testImg.onerror = () => {}; // keep default svg
    testImg.src = 'assets/logo.png';
  }

  // Hide broken images (so no broken icons)
  document.querySelectorAll('img[data-hide-if-missing]').forEach(img => {
    img.addEventListener('error', () => {
      const parentMedia = img.closest('.media') || img.parentElement;
      (parentMedia || img).style.display = 'none';
    }, { once: true });
  });

  // Scroll reveal animations
  const revealSelectors = [
    '.hero-inner > *',
    '.section-head',
    '.media',
    '.features-grid .card',
    '.steps li',
    '.plans-grid .card',
    '.integrations .chip',
    '.donation',
    '.footer-grid > div'
  ];

  const seen = new Set();
  const elements = [];
  revealSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      if (seen.has(el)) return;
      seen.add(el);
      elements.push(el);
    });
  });

  if (elements.length) {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observer = prefersReduced ? null : new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -40px'
    });

    elements.forEach((el, index) => {
      el.classList.add('reveal');
      const delay = Math.min(index * 60, 480);
      el.style.setProperty('--reveal-delay', `${delay}ms`);
      if (observer) {
        observer.observe(el);
      } else {
        el.classList.add('is-visible');
      }
    });
  }

  // Hero mesh parallax (desktop only)
  const hero = document.querySelector('.hero');
  const mesh = document.querySelector('.hero-mesh');
  if (hero && mesh && window.matchMedia('(pointer:fine)').matches) {
    let rafId = null;
    let targetX = 0;
    let targetY = 0;

    const updateMesh = () => {
      hero.style.setProperty('--tilt-x', targetX.toFixed(4));
      hero.style.setProperty('--tilt-y', targetY.toFixed(4));
      rafId = null;
    };

    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      targetX = x;
      targetY = y;
      if (rafId === null) {
        rafId = requestAnimationFrame(updateMesh);
      }
    });

    hero.addEventListener('pointerleave', () => {
      targetX = 0;
      targetY = 0;
      if (rafId === null) {
        rafId = requestAnimationFrame(updateMesh);
      }
    });
  }
});
