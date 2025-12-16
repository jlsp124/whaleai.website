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
    btn.textContent = 'Copied ✅';
    setTimeout(()=> btn.textContent = prev, 900);
  });
});

// Optional config hydration (for local dev / hosted API)
async function hydrateFromApiConfig() {
  const qs = new URLSearchParams(window.location.search);
  const apiBase = qs.get('api');
  if (!apiBase) return;

  try {
    const base = apiBase.replace(/\\/$/, '');
    const res = await fetch(base + '/api/config');
    if (!res.ok) return;
    const cfg = await res.json();

    const treasury = document.getElementById('wallet');
    if (treasury && cfg.treasury_address) treasury.textContent = cfg.treasury_address;

    const pro = document.getElementById('proPrice');
    if (pro && cfg.pro_price_sol) pro.textContent = Number(cfg.pro_price_sol).toFixed(2);
  } catch (_) {
    // ignore
  }
}

// Swap logo to assets/Logo.png if present; hide images if missing
document.addEventListener('DOMContentLoaded', () => {
  // Try to use a custom PNG logo if available
  const brandLogos = document.querySelectorAll('img.logo');
  if (brandLogos.length) {
    const testImg = new Image();
    testImg.onload = () => { brandLogos.forEach(img => img.src = 'assets/Logo.png'); };
    testImg.onerror = () => {}; // keep default svg
    testImg.src = 'assets/Logo.png';
  }

  // Hide broken images (so no broken icons)
  document.querySelectorAll('img[data-hide-if-missing]').forEach(img => {
    img.addEventListener('error', () => {
      const parentMedia = img.closest('.media') || img.parentElement;
      (parentMedia || img).style.display = 'none';
    }, { once: true });
  });

  hydrateFromApiConfig();
});
