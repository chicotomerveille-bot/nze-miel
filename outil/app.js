const CFG = window.NZE_CONFIG || {};
const API = CFG.API_BACKEND_URL || (location.port === '3000' ? '' : 'http://localhost:3000');
const EXTRA_HEADERS = CFG.API_HEADERS || {};
let refreshInterval = null;
let currentTab = 'dashboard';

// ─── Auth ───
function getToken() { return localStorage.getItem('nzetoken'); }
function checkAuth() { if (!getToken()) window.location.href = 'login.html'; }
checkAuth();

function headers() { return Object.assign({}, EXTRA_HEADERS, { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' }); }

function api(path) {
  return fetch(API + path, { headers: headers() }).then(r => {
    if (r.status === 401) { localStorage.removeItem('nzetoken'); window.location.href = 'login.html'; throw new Error('Non autorisé'); }
    if (!r.ok) throw new Error(r.status);
    return r.json();
  });
}

// ─── Toast ───
function toast(msg, type) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.style.background = type === 'error' ? '#C62828' : type === 'success' ? '#2E7D32' : '#1A120B';
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2500);
}

// ─── Navigation ───
document.querySelectorAll('[data-tab]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('[data-tab]').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    currentTab = link.dataset.tab;
    document.getElementById('tab-' + currentTab).classList.add('active');
    if (refreshInterval) clearInterval(refreshInterval);
    if (currentTab === 'dashboard') startRefresh(loadDashboard, 8000);
    else if (currentTab === 'orders') startRefresh(loadOrders, 8000);
    else if (currentTab === 'subscriptions') startRefresh(loadSubs, 8000);
    updatePendingBadge();
  });
});

function startRefresh(fn, ms) {
  fn();
  refreshInterval = setInterval(fn, ms);
}

function fmtTime() { return new Date().toLocaleTimeString('fr-FR'); }
function updateBadge(id, count) {
  const el = document.getElementById(id);
  if (el) { el.textContent = count; el.style.display = count > 0 ? '' : 'none'; }
}

// ─── Dashboard ───
async function loadDashboard() {
  document.getElementById('dashTime').textContent = 'Dernière màj : ' + fmtTime();
  try {
    const [orders, subs] = await Promise.all([api('/api/orders/stats'), api('/api/subscriptions/stats')]);
    const pending = Number(orders.pending) || 0;
    updateBadge('badgeOrders', pending);
    document.getElementById('dashboardStats').innerHTML = `
      <div class="stat-card"><span class="num">${orders.total}</span><span class="lbl">Commandes totales</span></div>
      <div class="stat-card"><span class="num" style="color:#E65100">${pending}</span><span class="lbl">En attente</span><div class="change ${pending > 0 ? 'up' : ''}">${pending > 0 ? '⚠ À traiter' : '✓ Aucune'}</div></div>
      <div class="stat-card"><span class="num">${Number(orders.revenue).toLocaleString()} F</span><span class="lbl">Revenu total</span></div>
      <div class="stat-card"><span class="num">${Number(orders.monthRevenue).toLocaleString()} F</span><span class="lbl">Revenu ce mois</span></div>
      <div class="stat-card"><span class="num">${subs.total}</span><span class="lbl">Abonnements actifs</span></div>
      <div class="stat-card"><span class="num">${Number(subs.monthlyRevenue).toLocaleString()} F</span><span class="lbl">Revenu abonnements/mois</span></div>
    `;
  } catch (e) {
    document.getElementById('dashboardStats').innerHTML = `<div class="error-msg">❌ Impossible de charger les statistiques</div>`;
  }
  try {
    const recent = await api('/api/orders?limit=5');
    const tbody = document.getElementById('recentOrders');
    if (recent.length) {
      tbody.innerHTML = recent.map(o => `<tr>
        <td><strong>${esc(o.customer_name)}</strong></td>
        <td>${esc(o.customer_phone)}</td>
        <td>${esc(o.product_name)}</td>
        <td>${o.quantity ? o.quantity + 'x' : ''} ${o.total ? Number(o.total).toLocaleString() + ' F' : '—'}</td>
        <td><span class="b b-${o.status}">${o.status}</span></td>
        <td>${fmtDate(o.created_at)}</td>
        <td>${o.status === 'pending' ? `<button class="btn btn-s btn-sm" onclick="updOrder(${o.id},'confirmed')">✓ Confirmer</button>` : ''}
            ${o.status === 'confirmed' ? `<button class="btn btn-s btn-sm" onclick="updOrder(${o.id},'delivered')">📦 Livrer</button>` : ''}
            ${!['cancelled','delivered'].includes(o.status) ? `<button class="btn btn-d btn-sm" onclick="updOrder(${o.id},'cancelled')">✕ Annuler</button>` : ''}
        </td>
      </tr>`).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#8A7A6A;">Aucune commande récente</td></tr>`;
    }
  } catch (e) {
    document.getElementById('recentOrders').innerHTML = `<tr><td colspan="7" style="text-align:center;color:#8A7A6A;">Erreur de chargement</td></tr>`;
  }
}

// ─── Commandes ───
async function loadOrders() {
  document.getElementById('orderTime').textContent = '🔄 ' + fmtTime();
  try {
    const status = document.getElementById('orderFilter').value;
    const url = status ? `/api/orders?status=${status}` : '/api/orders';
    const orders = await api(url);
    const container = document.getElementById('ordersContainer');
    if (orders.length) {
      container.innerHTML = `<div class="table-wrap"><table><thead><tr>
        <th>#</th><th>Client</th><th>Téléphone</th><th>Produit</th><th>Qté</th><th>Total</th><th>Statut</th><th>Date</th><th>Action</th>
      </tr></thead><tbody>${orders.map(o => `<tr>
        <td style="color:#8A7A6A;">#${o.id}</td>
        <td><strong>${esc(o.customer_name)}</strong></td>
        <td><a href="https://wa.me/${o.customer_phone?.replace(/\s/g,'')}" target="_blank" style="color:#2E7D32;text-decoration:none;">${esc(o.customer_phone)}</a></td>
        <td>${esc(o.product_name)}</td>
        <td>${o.quantity}</td>
        <td><strong>${o.total ? Number(o.total).toLocaleString() : '—'}</strong> F</td>
        <td><span class="b b-${o.status}">${o.status}</span></td>
        <td style="font-size:12px;color:#8A7A6A;">${fmtDate(o.created_at)}</td>
        <td nowrap>
          ${o.status === 'pending' ? `<button class="btn btn-s btn-sm" onclick="updOrder(${o.id},'confirmed')">✓</button> ` : ''}
          ${o.status === 'confirmed' ? `<button class="btn btn-s btn-sm" onclick="updOrder(${o.id},'delivered')">📦</button> ` : ''}
          ${!['cancelled','delivered'].includes(o.status) ? `<button class="btn btn-d btn-sm" onclick="updOrder(${o.id},'cancelled')">✕</button>` : ''}
          <button class="btn btn-o btn-sm" onclick="wa('${o.customer_phone}','${esc(o.customer_name)}','${esc(o.product_name)}')">📱</button>
        </td>
      </tr>`).join('')}</tbody></table></div>`;
    } else {
      container.innerHTML = `<div class="empty-state"><div class="icon">📋</div><p>Aucune commande ${status ? 'avec ce statut' : ''}</p></div>`;
    }
  } catch (e) {
    document.getElementById('ordersContainer').innerHTML = `<div class="error-msg">❌ Erreur chargement des commandes</div>`;
  }
}

async function updOrder(id, status) {
  try {
    const btn = event?.target;
    if (btn) btn.disabled = true;
    await fetch(`${API}/api/orders/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status }) });
    toast(status === 'confirmed' ? 'Commande confirmée ✓' : status === 'delivered' ? 'Livraison marquée ✓' : 'Commande annulée', 'success');
    if (currentTab === 'dashboard') loadDashboard(); else loadOrders();
    updatePendingBadge();
  } catch (e) { toast('Erreur: ' + e.message, 'error'); if (btn) btn.disabled = false; }
}

document.getElementById('orderFilter')?.addEventListener('change', loadOrders);

async function updatePendingBadge() {
  try {
    const stats = await api('/api/orders/stats');
    updateBadge('badgeOrders', Number(stats.pending) || 0);
  } catch(e) {}
}

// ─── Produits ───
async function loadProducts() {
  try {
    const products = await api('/api/products');
    const container = document.getElementById('productsContainer');
    if (products.length) {
      container.innerHTML = `<div class="table-wrap"><table><thead><tr>
        <th>#</th><th>Nom</th><th>Taille</th><th>Prix boutique</th><th>Prix abonné</th><th>Prix pro</th><th>⭐</th><th>Actif</th>
      </tr></thead><tbody>${products.map(p => `<tr>
        <td style="color:#8A7A6A;">#${p.id}</td>
        <td><strong>${esc(p.name)}</strong></td>
        <td>${p.size_ml}ml</td>
        <td>${p.price_boutique ? Number(p.price_boutique).toLocaleString() + ' F' : '—'}</td>
        <td>${p.price_abonne ? Number(p.price_abonne).toLocaleString() + ' F' : '—'}</td>
        <td>${p.price_pro ? Number(p.price_pro).toLocaleString() + ' F' : '—'}</td>
        <td>${p.is_featured ? '⭐' : '—'}</td>
        <td>${p.active ? '<span style="color:#2E7D32;">✓</span>' : '<span style="color:#C62828;">✕</span>'}</td>
      </tr>`).join('')}</tbody></table></div>`;
    } else {
      container.innerHTML = `<div class="empty-state"><div class="icon">📦</div><p>Aucun produit</p></div>`;
    }
  } catch (e) {
    document.getElementById('productsContainer').innerHTML = `<div class="error-msg">❌ Erreur chargement des produits</div>`;
  }
}

// ─── Abonnements ───
async function loadSubs() {
  document.getElementById('subTime').textContent = '🔄 ' + fmtTime();
  try {
    const status = document.getElementById('subFilter').value;
    const url = status ? `/api/subscriptions?status=${status}` : '/api/subscriptions';
    const subs = await api(url);
    const container = document.getElementById('subsContainer');
    if (subs.length) {
      container.innerHTML = `<div class="table-wrap"><table><thead><tr>
        <th>Client</th><th>Téléphone</th><th>Format</th><th>Prix</th><th>Livraisons</th><th>Prochaine</th><th>Statut</th><th>Action</th>
      </tr></thead><tbody>${subs.map(s => `<tr>
        <td><strong>${esc(s.customer_name)}</strong></td>
        <td>${esc(s.customer_phone)}</td>
        <td>${s.size_ml}ml</td>
        <td>${Number(s.price).toLocaleString()} F/mois</td>
        <td>${s.deliveries_made}</td>
        <td style="font-size:12px;">${s.next_delivery ? fmtDate(s.next_delivery) : '—'}</td>
        <td><span class="b b-${s.status}">${s.status}</span></td>
        <td nowrap>
          ${s.status === 'active' ? `<button class="btn btn-s btn-sm" onclick="deliverSub(${s.id})">📦 Livrer</button> <button class="btn btn-d btn-sm" onclick="cancelSub(${s.id})">✕ Stop</button>` : ''}
          ${s.status === 'paused' ? `<button class="btn btn-p btn-sm" onclick="resumeSub(${s.id})">▶ Reprendre</button>` : ''}
        </td>
      </tr>`).join('')}</tbody></table></div>`;
    } else {
      container.innerHTML = `<div class="empty-state"><div class="icon">🔄</div><p>Aucun abonnement ${status ? 'avec ce statut' : ''}</p></div>`;
    }
  } catch (e) {
    document.getElementById('subsContainer').innerHTML = `<div class="error-msg">❌ Erreur chargement des abonnements</div>`;
  }
}

async function deliverSub(id) {
  if (!confirm('Marquer cette livraison comme effectuée ?')) return;
  try {
    await fetch(`${API}/api/subscriptions/${id}/deliver`, { method: 'POST', headers: headers() });
    toast('Livraison enregistrée ✓', 'success');
    loadSubs(); loadDashboard();
  } catch (e) { toast('Erreur: ' + e.message, 'error'); }
}

async function cancelSub(id) {
  if (!confirm('Annuler cet abonnement ?')) return;
  try {
    await fetch(`${API}/api/subscriptions/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status: 'cancelled' }) });
    toast('Abonnement annulé', 'success');
    loadSubs();
  } catch (e) { toast('Erreur: ' + e.message, 'error'); }
}

async function resumeSub(id) {
  try {
    await fetch(`${API}/api/subscriptions/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status: 'active' }) });
    toast('Abonnement repris ✓', 'success');
    loadSubs();
  } catch (e) { toast('Erreur: ' + e.message, 'error'); }
}

document.getElementById('subFilter')?.addEventListener('change', loadSubs);

// ─── Clients ───
let customerTimer = null;
async function loadCustomers() {
  try {
    const search = document.getElementById('customerSearch').value;
    const url = search ? `/api/customers?search=${encodeURIComponent(search)}` : '/api/customers';
    const customers = await api(url);
    const container = document.getElementById('customersContainer');
    if (customers.length) {
      container.innerHTML = `<div class="table-wrap"><table><thead><tr>
        <th>Nom</th><th>Téléphone</th><th>Ville</th><th>Quartier</th><th>Achats</th><th>VIP</th><th>Depuis</th>
      </tr></thead><tbody>${customers.map(c => `<tr>
        <td><strong>${esc(c.name)}</strong></td>
        <td>${esc(c.phone)}</td>
        <td>${esc(c.city)}</td>
        <td>${c.neighborhood || '—'}</td>
        <td>${c.purchase_count}</td>
        <td>${c.is_vip ? '<span class="b b-vip">👑 VIP</span>' : '—'}</td>
        <td style="font-size:12px;color:#8A7A6A;">${fmtDate(c.created_at)}</td>
      </tr>`).join('')}</tbody></table></div>`;
    } else {
      container.innerHTML = `<div class="empty-state"><div class="icon">👥</div><p>Aucun client trouvé</p></div>`;
    }
  } catch (e) {
    document.getElementById('customersContainer').innerHTML = `<div class="error-msg">❌ Erreur chargement des clients</div>`;
  }
}

document.getElementById('customerSearch')?.addEventListener('input', () => {
  clearTimeout(customerTimer);
  customerTimer = setTimeout(loadCustomers, 300);
});

// ─── WhatsApp rapide ───
function wa(phone, name, product) {
  const num = phone?.replace(/\s/g,'');
  if (!num) return;
  const msg = `Bonjour ${name} ! Suite à votre commande de ${product} chez Nzé Miel.`;
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ─── Déconnexion ───
document.getElementById('logoutBtn')?.addEventListener('click', e => {
  e.preventDefault();
  localStorage.removeItem('nzetoken');
  localStorage.removeItem('nzetime');
  window.location.href = 'login.html';
});

// ─── Utilitaires ───
function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function fmtDate(d) { try { const dt = new Date(d); return dt.toLocaleDateString('fr-FR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}); } catch(e) { return d || '—'; } }

// ─── SSE temps réel ───
function connectSSE() {
  const token = getToken();
  if (!token) return;
  const src = new EventSource(API + '/api/events');
  src.addEventListener('connected', () => { console.log('SSE connecté'); });
  src.addEventListener('order:created', () => { refreshCurrentTab(); toast('🆕 Nouvelle commande reçue !', 'success'); });
  src.addEventListener('order:updated', (e) => { const d = JSON.parse(e.data); refreshCurrentTab(); toast(`Commande #${d.id} → ${d.status}`, ''); });
  src.addEventListener('subscription:created', () => { refreshCurrentTab(); toast('🆕 Nouvel abonnement', 'success'); });
  src.addEventListener('subscription:updated', () => { refreshCurrentTab(); });
  src.addEventListener('subscription:delivered', () => { refreshCurrentTab(); toast('📦 Livraison effectuée', 'success'); });
  src.onerror = () => { setTimeout(connectSSE, 3000); };
}
function refreshCurrentTab() {
  if (currentTab === 'dashboard') loadDashboard();
  else if (currentTab === 'orders') loadOrders();
  else if (currentTab === 'subscriptions') loadSubs();
  loadProducts();
  loadCustomers();
  updatePendingBadge();
}

// ─── Démarrage ───
startRefresh(loadDashboard, 8000);
loadProducts();
loadCustomers();
updatePendingBadge();
connectSSE();
