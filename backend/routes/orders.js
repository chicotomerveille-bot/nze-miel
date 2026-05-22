const { Router } = require('express');
const { prepare } = require('../db');
const { broadcast } = require('../events');

const router = Router();

router.get('/', (req, res) => {
  const { status, limit } = req.query;
  let sql = 'SELECT * FROM orders';
  const params = [];
  if (status) { sql += ' WHERE status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
  res.json(prepare(sql).all(...params).filter(Boolean));
});

router.get('/stats', (req, res) => {
  const total = prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const pending = prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'").get().c;
  const delivered = prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'delivered'").get().c;
  const revenue = prepare('SELECT COALESCE(SUM(total), 0) as s FROM orders').get().s;
  const monthRevenue = prepare("SELECT COALESCE(SUM(total), 0) as s FROM orders WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')").get().s;
  res.json({ total, pending, delivered, revenue, monthRevenue });
});

router.post('/', (req, res) => {
  const { customer_name, customer_phone, product_id, product_name, quantity, unit_price, total, neighborhood, notes, source } = req.body;
  if (!customer_name || !customer_phone || !product_name) {
    return res.status(400).json({ error: 'Nom, téléphone et produit requis' });
  }

  const result = prepare(`
    INSERT INTO orders (customer_name, customer_phone, product_id, product_name, quantity, unit_price, total, neighborhood, notes, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(customer_name, customer_phone, product_id || null, product_name, quantity || 1, unit_price || null, total || null, neighborhood || null, notes || null, source || 'whatsapp');

  // MAJ client existant
  const existing = prepare('SELECT * FROM customers WHERE phone = ?').get(customer_phone);
  if (existing) {
    prepare('UPDATE customers SET purchase_count = purchase_count + 1, name = ? WHERE id = ?').run(customer_name, existing.id);
    const updated = prepare('SELECT * FROM customers WHERE id = ?').get(existing.id);
    if (updated.purchase_count >= 3 && !updated.is_vip) {
      prepare('UPDATE customers SET is_vip = 1 WHERE id = ?').run(existing.id);
      prepare(`INSERT INTO loyalty_log (customer_id, action, description) VALUES (?, 'vip', ?)`).run(existing.id, 'Badge VIP automatique');
    }
  }

  broadcast('order:created', { id: result.lastInsertRowid, status: 'pending' });
  res.status(201).json({ id: result.lastInsertRowid, message: 'Commande créée' });
});

router.put('/:id', (req, res) => {
  const { status, notes } = req.body;
  if (!status) return res.status(400).json({ error: 'Statut requis' });
  if (!['pending','confirmed','delivered','cancelled'].includes(status)) return res.status(400).json({ error: 'Statut invalide' });

  prepare("UPDATE orders SET status = ?, updated_at = datetime('now', '+1 hour') WHERE id = ?").run(status, req.params.id);
  if (notes) prepare('UPDATE orders SET notes = ? WHERE id = ?').run(notes, req.params.id);

  broadcast('order:updated', { id: parseInt(req.params.id), status });
  res.json({ message: `Commande #${req.params.id} passée à "${status}"` });
});

module.exports = router;
