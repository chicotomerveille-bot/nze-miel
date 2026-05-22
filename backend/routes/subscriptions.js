const { Router } = require('express');
const { prepare } = require('../db');
const { broadcast } = require('../events');

const router = Router();

router.get('/', (req, res) => {
  const { status } = req.query;
  let sql = `SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.city, c.neighborhood 
             FROM subscriptions s LEFT JOIN customers c ON s.customer_id = c.id`;
  const params = [];
  if (status) { sql += ' WHERE s.status = ?'; params.push(status); }
  sql += ' ORDER BY s.created_at DESC';
  res.json(prepare(sql).all(...params));
});

router.get('/stats', (req, res) => {
  const total = prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'active'").get().c;
  const monthlyRevenue = prepare("SELECT COALESCE(SUM(price), 0) as s FROM subscriptions WHERE status = 'active'").get().s;
  const renewalToday = prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'active' AND next_delivery = date('now')").get().c;
  res.json({ total, monthlyRevenue, renewalToday });
});

router.post('/', (req, res) => {
  const { customer_id, customer_name, customer_phone, product_id, size_ml, price, prepaid_months } = req.body;
  if (!customer_name || !customer_phone || !size_ml || !price) {
    return res.status(400).json({ error: 'Nom, téléphone, taille et prix requis' });
  }

  const nextDelivery = new Date();
  nextDelivery.setMonth(nextDelivery.getMonth() + 1);
  const nextDeliveryStr = nextDelivery.toISOString().slice(0, 10);

  const result = prepare(`
    INSERT INTO subscriptions (customer_id, customer_name, customer_phone, product_id, size_ml, price, prepaid_months, next_delivery)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(customer_id || null, customer_name, customer_phone, product_id || null, size_ml, price, prepaid_months || 0, nextDeliveryStr);

  if (customer_id) {
    prepare(`INSERT INTO loyalty_log (customer_id, action, description) VALUES (?, 'subscription', ?)`).run(customer_id, `Abonnement souscrit : ${size_ml}ml à ${price}FCFA/mois`);
    prepare('UPDATE customers SET purchase_count = purchase_count + 1 WHERE id = ?').run(customer_id);
  }

  broadcast('subscription:created', { id: result.lastInsertRowid });
  res.status(201).json({ id: result.lastInsertRowid, message: 'Abonnement créé' });
});

router.put('/:id', (req, res) => {
  const { status, next_delivery, deliveries_made } = req.body;
  const sets = [];
  const params = [];
  if (status) { sets.push('status = ?'); params.push(status); }
  if (next_delivery) { sets.push('next_delivery = ?'); params.push(next_delivery); }
  if (deliveries_made !== undefined) { sets.push('deliveries_made = ?'); params.push(deliveries_made); }
  if (!sets.length) return res.status(400).json({ error: 'Rien à mettre à jour' });

  params.push(req.params.id);
  prepare(`UPDATE subscriptions SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  broadcast('subscription:updated', { id: parseInt(req.params.id), status });
  res.json({ message: 'Abonnement mis à jour' });
});

router.post('/:id/deliver', (req, res) => {
  const sub = prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Abonnement introuvable' });

  const nextDelivery = new Date();
  nextDelivery.setMonth(nextDelivery.getMonth() + 1);
  const nextStr = nextDelivery.toISOString().slice(0, 10);

  prepare(`UPDATE subscriptions SET deliveries_made = deliveries_made + 1, last_delivery = date('now'), next_delivery = ?, status = 'active' WHERE id = ?`).run(nextStr, req.params.id);

  prepare(`INSERT INTO orders (customer_id, customer_name, customer_phone, product_id, product_name, quantity, unit_price, total, status, source, notes)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'delivered', 'abonnement', 'Livraison abonnement automatique')`)
    .run(sub.customer_id, sub.customer_name, sub.customer_phone, sub.product_id, `Nzé ${sub.size_ml}ml`, sub.price, sub.price);

  broadcast('subscription:delivered', { id: parseInt(req.params.id), next_delivery: nextStr });
  res.json({ message: 'Livraison enregistrée', next_delivery: nextStr });
});

module.exports = router;
