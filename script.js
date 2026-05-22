// ─── CONFIG ───
const CFG = window.NZE_CONFIG || {};
const API_BASE = (CFG.API_BACKEND_URL || window.location.origin) + '/api';
const EXTRA_HEADERS = CFG.API_HEADERS || {};
const WA_NUMBER = '229XXXXXXXX';

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

new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(document.getElementById('clientCount'), 843);
      animateCounter(document.getElementById('potCount'), 3200);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 }).observe(document.querySelector('.hero-metrics'));

// ─── WHATSAPP COMMANDE ───
document.querySelectorAll('.btn-wa').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const produit = btn.dataset.produit || 'Miel Nzé';
    const prix = btn.dataset.prix || '';
    const msg = encodeURIComponent(
      `Bonjour Nzé ! Je souhaite commander :\n\n📦 ${produit}${prix ? ` (${parseInt(prix).toLocaleString()} FCFA)` : ''}\n🔢 Quantité : 1\n📍 Quartier : [à préciser]\n📞 Tél : [votre numéro]\n\nMerci !`
    );
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
  });
});

// ─── FORMULAIRE CONTACT → API + WhatsApp ───
document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const vals = Object.fromEntries(fd.entries());

  // Envoyer à l'API
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
  } catch (err) { console.log('API indisponible, envoi WhatsApp direct'); }

  // Envoyer WhatsApp
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
  Array.from(grid.children).forEach((child, i) => child.style.transitionDelay = `${i * 0.07}s`);
});

// ─── SMOOTH SCROLL ───
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});
