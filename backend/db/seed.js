const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

function toNull(v) { return v === undefined ? null : v; }
function futureDate(months) { const d = new Date(); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10); }

async function seed() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'nze.db');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  db.run(schema);

  // ── Produits ──
  const products = [
    { name: 'Nzé 250ml', size_ml: 250, price_boutique: 2500, price_abonne: 1800, featured: 0, sort: 1 },
    { name: 'Nzé 500ml', size_ml: 500, price_boutique: 4000, price_abonne: 3200, featured: 1, sort: 2 },
    { name: 'Nzé 1 Litre', size_ml: 1000, price_boutique: 7000, price_abonne: 6000, featured: 0, sort: 3 },
    { name: 'Nzé 2 Litres', size_ml: 2000, price_abonne: 10500, sort: 4 },
    { name: 'Nzé 5 Litres (Vrac)', size_ml: 5000, price_pro: 25000, b2b: 1, sort: 5 }
  ];

  const insP = db.prepare(`INSERT OR REPLACE INTO products (id, name, size_ml, price_boutique, price_abonne, price_pro, is_featured, is_b2b, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  products.forEach((p, i) => {
    insP.bind([i+1, p.name, p.size_ml, toNull(p.price_boutique), toNull(p.price_abonne), toNull(p.price_pro), p.featured || 0, p.b2b || 0, p.sort]);
    insP.step(); insP.reset();
  });

  // ── Clients ──
  const customers = [
    { name: 'Mariam Bello', phone: '+22961112233', city: 'Cotonou', hood: 'Cadjehoun', cnt: 6, vip: 1 },
    { name: 'Thomas Adjovi', phone: '+22962223344', city: 'Porto-Novo', hood: 'Ahomey', cnt: 3, vip: 1 },
    { name: 'Fatimatou Zinsou', phone: '+22963334455', city: 'Parakou', hood: 'Ara', cnt: 4, vip: 0 },
    { name: 'Dr. Paulin Agossou', phone: '+22964445566', city: 'Porto-Novo', hood: 'Houeme', cnt: 8, vip: 1 },
    { name: 'Sophie Kounkou', phone: '+22965556677', city: 'Cotonou', hood: 'Fidjrosse', cnt: 2, vip: 0 }
  ];

  const insC = db.prepare(`INSERT OR IGNORE INTO customers (name, phone, city, neighborhood, purchase_count, is_vip, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  customers.forEach(c => {
    const code = `PARRAIN-${c.phone.slice(-4)}`;
    insC.bind([c.name, c.phone, c.city, c.hood, c.cnt, c.vip, code]);
    insC.step(); insC.reset();
  });

  // ── Commandes ──
  const insO = db.prepare(`INSERT INTO orders (customer_id, customer_name, customer_phone, product_id, product_name, quantity, unit_price, total, status, neighborhood) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const orders = [
    [1, 'Mariam Bello', '+22961112233', 2, 'Nzé 500ml', 1, 4000, 4000, 'delivered', 'Cadjehoun'],
    [1, 'Mariam Bello', '+22961112233', 2, 'Nzé 500ml', 1, 3200, 3200, 'delivered', 'Cadjehoun'],
    [2, 'Thomas Adjovi', '+22962223344', 3, 'Nzé 1 Litre', 2, 7000, 14000, 'delivered', 'Ahomey'],
    [3, 'Fatimatou Zinsou', '+22963334455', 2, 'Nzé 500ml', 1, 4000, 4000, 'pending', 'Ara'],
    [4, 'Dr. Paulin Agossou', '+22964445566', 3, 'Nzé 1 Litre', 1, 7000, 7000, 'delivered', 'Houeme']
  ];
  orders.forEach(o => { insO.bind(o); insO.step(); insO.reset(); });

  // ── Abonnements ──
  const insS = db.prepare(`INSERT INTO subscriptions (customer_id, customer_name, customer_phone, product_id, size_ml, price, status, deliveries_made, next_delivery) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const subs = [
    [1, 'Mariam Bello', '+22961112233', 2, 500, 3200, 'active', 3, futureDate(1)],
    [3, 'Fatimatou Zinsou', '+22963334455', 3, 1000, 6000, 'active', 1, futureDate(1)],
    [4, 'Dr. Paulin Agossou', '+22964445566', 2, 500, 3200, 'active', 6, futureDate(1)]
  ];
  subs.forEach(s => { insS.bind(s); insS.step(); insS.reset(); });

  // ── Sauvegarde ──
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();

  console.log('✅ Base initialisée avec succès !');
  console.log(`  📦 ${products.length} produits`);
  console.log(`  👤 ${customers.length} clients`);
  console.log(`  📋 ${orders.length} commandes`);
  console.log(`  🔄 ${subs.length} abonnements`);
}

seed().catch(e => { console.error('Erreur seed:', e); process.exit(1); });
