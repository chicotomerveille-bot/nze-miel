const CFG = window.NZE_CONFIG || {};
const API_BASE = (CFG.API_BACKEND_URL || window.location.origin) + '/api';
const EXTRA_HEADERS = CFG.API_HEADERS || {};
const WA_NUMBER = CFG.WHATSAPP_NUMBER || '229XXXXXXXX';

// ─── NAV SCROLL ───
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 50), { passive: true });

// ─── TOPBAR ───
document.getElementById('topbarClose')?.addEventListener('click', () => {
  document.getElementById('topbar').classList.add('hidden');
});

// ─── MENU MOBILE ───
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
menuBtn?.addEventListener('click', () => {
  menuBtn.classList.toggle('open');
  navLinks.classList.toggle('open');
  document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
});
navLinks?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    menuBtn.classList.remove('open');
    navLinks.classList.remove('open');
    document.body.style.overflow = '';
  });
});

// ─── DARK MODE ───
const darkToggle = document.getElementById('darkToggle');
const savedTheme = localStorage.getItem('nze-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
darkToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
darkToggle?.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('nze-theme', next);
  darkToggle.textContent = next === 'dark' ? '☀️' : '🌙';
});

// ─── QUANTITY SELECTOR ───
document.querySelectorAll('.qty-wrap').forEach(wrap => {
  const input = wrap.querySelector('.qty-num');
  const minus = wrap.querySelector('.qty-minus');
  const plus = wrap.querySelector('.qty-plus');
  const btn = wrap.parentElement.querySelector('.btn-wa');
  minus?.addEventListener('click', () => {
    let v = parseInt(input.value) || 1;
    if (v > 1) { v--; input.value = v; if (btn) btn.dataset.qty = v; }
  });
  plus?.addEventListener('click', () => {
    let v = parseInt(input.value) || 1;
    if (v < 99) { v++; input.value = v; if (btn) btn.dataset.qty = v; }
  });
});

// ─── COMPTEURS ANIMÉS ───
function animateCounter(el, target) {
  let i = 0;
  const step = Math.ceil(target / 50);
  const t = setInterval(() => {
    i += step;
    if (i >= target) { i = target; clearInterval(t); }
    el.textContent = i.toLocaleString('fr-FR');
  }, 25);
}
const metricsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(document.getElementById('clientCount'), 843);
      animateCounter(document.getElementById('potCount'), 3200);
      metricsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });
const metricsTarget = document.querySelector('.hero-metrics');
if (metricsTarget) metricsObserver.observe(metricsTarget);

// ─── WHATSAPP COMMANDE ───
document.querySelectorAll('.btn-wa').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const produit = btn.dataset.produit || 'Miel Nzé';
    const prix = btn.dataset.prix || '';
    const qty = btn.dataset.qty || btn.parentElement?.querySelector('.qty-num')?.value || 1;
    const total = prix ? parseInt(prix) * parseInt(qty) : 0;
    const msg = encodeURIComponent(
      `Bonjour Nzé ! Je souhaite commander :\n\n📦 ${produit}${prix ? ` (${parseInt(prix).toLocaleString()} FCFA/unité)` : ''}\n🔢 Quantité : ${qty}\n💰 Total : ${total.toLocaleString()} FCFA\n📍 Quartier : [à préciser]\n📞 Tél : [votre numéro]\n\nMerci !`
    );
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
    showToast(`✅ ${qty}x ${produit} préparé dans WhatsApp`, 'success');
  });
});

// ─── TOAST NOTIFICATIONS ───
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; }, 2500);
  setTimeout(() => toast.remove(), 3000);
}

// ─── FORMULAIRE CONTACT → API + WhatsApp ───
document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const vals = Object.fromEntries(fd.entries());
  try {
    await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: Object.assign({}, EXTRA_HEADERS, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        customer_name: vals[Object.keys(vals)[0]] || 'Inconnu',
        customer_phone: vals[Object.keys(vals)[1]] || '',
        product_name: vals[Object.keys(vals)[3]] || 'Non spécifié',
        neighborhood: vals[Object.keys(vals)[2]] || '',
        notes: vals[Object.keys(vals)[4]] || '',
        source: 'whatsapp'
      })
    });
    showToast('✅ Demande enregistrée', 'success');
  } catch { showToast('⚠️ Envoi direct WhatsApp', 'error'); }
  const msg = encodeURIComponent(
    `🆕 Nouvelle commande Nzé :\n\n👤 Nom : ${vals[Object.keys(vals)[0]] || ''}\n📞 Tél : ${vals[Object.keys(vals)[1]] || ''}\n📍 Quartier : ${vals[Object.keys(vals)[2]] || ''}\n📦 Format : ${vals[Object.keys(vals)[3]] || ''}\n💬 Message : ${vals[Object.keys(vals)[4]] || ''}\n\nMerci de me recontacter.`
  );
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
  e.target.reset();
});

// ─── SCROLL REVEAL ───
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });
document.querySelectorAll('.prod-card, .fid-card, .abo-card, .tem-card, .ap-value').forEach(el => revealObserver.observe(el));
document.querySelectorAll('.produits-grid, .fid-grid, .abo-cards, .tem-grid').forEach(grid => {
  Array.from(grid.children).forEach((child, i) => child.style.setProperty('--i', i));
});

// ─── SMOOTH SCROLL ───
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});

// ─── BACK TO TOP ───
const backTop = document.getElementById('backTop');
window.addEventListener('scroll', () => {
  backTop.classList.toggle('visible', window.scrollY > 500);
}, { passive: true });
backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ─── PROGRESS BAR ───
const progressBar = document.getElementById('progressBar');
window.addEventListener('scroll', () => {
  const h = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = h > 0 ? `${(window.scrollY / h) * 100}%` : '0%';
}, { passive: true });

// ─── BOTTOM BAR ACTIVE LINK ───
const bottomLinks = document.querySelectorAll('.bottom-link');
const sections = ['boutique', 'abonnement', 'apropos', 'contact'];
window.addEventListener('scroll', () => {
  let current = '/';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 120) current = `#${id}`;
  });
  bottomLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === current);
  });
}, { passive: true });
