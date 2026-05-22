const { Router } = require('express');
const { prepare } = require('../db');
const { broadcast } = require('../events');

const router = Router();

router.get('/', async (req, res) => {
  const { status } = req.query;
  let sql = `SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.city, c.neighborhood 
             FROM subscriptions s LEFT JOIN customers c ON s.customer_id = c.id`;
  const params = [];
  if (status) { sql += ' WHERE s.status = ?'; params.push(status); }
  sql += ' ORDER BY s.created_at DESC';
  const rows = await prepare(sql).all(...params);
  res.json(rows);
});

router.get('/stats', async (req, res) => {
  const total = await prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'active'").get();
  const monthlyRevenue = await prepare("SELECT COALESCE(SUM(price), 0) as s FROM subscriptions WHERE status = 'active'").get();
  const renewalToday = await prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'active' AND next_delivery = CURRENT_DATE").get();
  res.json({ total: total.c, monthlyRevenue: monthlyRevenue.s, renewalToday: renewalToday.c });
});

router.post('/', async (req, res) => {
  const { customer_id, customer_name, customer_phone, product_id, size_ml, price, prepaid_months } = req.body;
  if (!customer_name || !customer_phone || !size_ml || !price) {
    return res.status(400).json({ error: 'Nom, téléphone, taille et prix requis' });
  }
  const nextDelivery = new Date();
  nextDelivery.setMonth(nextDelivery.getMonth() + 1);
  const nextDeliveryStr = nextDelivery.toISOString().slice(0, 10);
  const result = await prepare(`
    INSERT INTO subscriptions (customer_id, customer_name, customer_phone, product_id, size_ml, price, prepaid_months, next_delivery)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(customer_id || null, customer_name, customer_phone, product_id || null, size_ml, price, prepaid_months || 0, nextDeliveryStr);
  if (customer_id) {
    await prepare("INSERT INTO loyalty_log (customer_id, action, description) VALUES (?, 'subscription', ?)").run(customer_id, `Abonnement souscrit : ${size_ml}ml à ${price}FCFA/mois`);
    await prepare('UPDATE customers SET purchase_count = purchase_count + 1 WHERE id = ?').run(customer_id);
  }
  broadcast('subscription:created', { id: result.lastInsertRowid });
  res.status(201).json({ id: result.lastInsertRowid, message: 'Abonnement créé' });
});

router.put('/:id', async (req, res) => {
  const { status, next_delivery, deliveries_made } = req.body;
  const sets = [];
  const params = [];
  if (status) { sets.push('status = ?'); params.push(status); }
  if (next_delivery) { sets.push('next_delivery = ?'); params.push(next_delivery); }
  if (deliveries_made !== undefined) { sets.push('deliveries_made = ?'); params.push(deliveries_made); }
  if (!sets.length) return res.status(400).json({ error: 'Rien à mettre à jour' });
  params.push(req.params.id);
  await prepare(`UPDATE subscriptions SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  broadcast('subscription:updated', { id: parseInt(req.params.id), status });
  res.json({ message: 'Abonnement mis à jour' });
});

router.post('/:id/deliver', async (req, res) => {
  const sub = await prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Abonnement introuvable' });
  const nextDelivery = new Date();
  nextDelivery.setMonth(nextDelivery.getMonth() + 1);
  const nextStr = nextDelivery.toISOString().slice(0, 10);
  await prepare("UPDATE subscriptions SET deliveries_made = deliveries_made + 1, last_delivery = CURRENT_DATE, next_delivery = ?, status = 'active' WHERE id = ?").run(nextStr, req.params.id);
  await prepare(`INSERT INTO orders (customer_id, customer_name, customer_phone, product_id, product_name, quantity, unit_price, total, status, source, notes)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'delivered', 'abonnement', 'Livraison abonnement automatique')`)
    .run(sub.customer_id, sub.customer_name, sub.customer_phone, sub.product_id, `Nzé ${sub.size_ml}ml`, sub.price, sub.price);
  broadcast('subscription:delivered', { id: parseInt(req.params.id), next_delivery: nextStr });
  res.json({ message: 'Livraison enregistrée', next_delivery: nextStr });
});

module.exports = router;
