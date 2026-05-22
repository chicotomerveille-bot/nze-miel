const { Router } = require('express');
const { prepare } = require('../db');

const router = Router();

router.get('/', async (req, res) => {
  const { search, vip } = req.query;
  let sql = 'SELECT * FROM customers';
  const params = [];
  const conds = [];
  if (search) { conds.push('(name ILIKE ? OR phone ILIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (vip === '1') conds.push('is_vip = 1');
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY created_at DESC';
  const rows = await prepare(sql).all(...params);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const customer = await prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Client introuvable' });
  const orders = await prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id);
  const subscription = await prepare("SELECT * FROM subscriptions WHERE customer_id = ? AND status = 'active'").get(req.params.id);
  res.json({ ...customer, orders, subscription });
});

router.post('/', async (req, res) => {
  const { name, phone, city, neighborhood, referred_by } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Nom et téléphone requis' });
  const existing = await prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
  if (existing) return res.json(existing);
  const code = `PARRAIN-${phone.slice(-4)}-${Date.now().toString(36)}`;
  const result = await prepare(`
    INSERT INTO customers (name, phone, city, neighborhood, referral_code, referred_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, phone, city || 'Cotonou', neighborhood || null, code, referred_by || null);
  const customer = await prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  if (referred_by) {
    await prepare('INSERT INTO referrals (referrer_id, referred_id) VALUES (?, ?)').run(referred_by, result.lastInsertRowid);
    await prepare("INSERT INTO loyalty_log (customer_id, action, description) VALUES (?, 'referral', ?)").run(referred_by, 'Nouveau filleul enregistré');
  }
  res.status(201).json(customer);
});

router.put('/:id', async (req, res) => {
  const existing = await prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Client introuvable' });
  const { name, phone, city, neighborhood, is_vip, purchase_count } = req.body;
  await prepare('UPDATE customers SET name=?, phone=?, city=?, neighborhood=?, is_vip=?, purchase_count=? WHERE id=?').run(
    name || existing.name, phone || existing.phone, city || existing.city,
    neighborhood !== undefined ? neighborhood : existing.neighborhood,
    is_vip !== undefined ? (is_vip ? 1 : 0) : existing.is_vip,
    purchase_count !== undefined ? purchase_count : existing.purchase_count,
    req.params.id
  );
  res.json({ message: 'Client mis à jour' });
});

router.post('/:id/increment-purchase', async (req, res) => {
  const customer = await prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Client introuvable' });
  const newCount = customer.purchase_count + 1;
  const isVip = newCount >= 3 ? 1 : 0;
  await prepare('UPDATE customers SET purchase_count = ?, is_vip = ? WHERE id = ?').run(newCount, isVip, req.params.id);
  if (newCount === 3) await prepare("INSERT INTO loyalty_log (customer_id, action, description) VALUES (?, 'vip', ?)").run(req.params.id, 'Badge VIP obtenu (-10% permanent)');
  if (newCount === 5) await prepare("INSERT INTO loyalty_log (customer_id, action, description) VALUES (?, 'reward', ?)").run(req.params.id, '5ème achat : 250ml offert');
  res.json({ purchase_count: newCount, is_vip: !!isVip, message: 'Achat comptabilisé' });
});

module.exports = router;
