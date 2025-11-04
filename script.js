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
