const { Router } = require('express');
const { prepare } = require('../db');

const router = Router();

router.get('/', (req, res) => {
  const rows = prepare('SELECT * FROM products WHERE active = 1 ORDER BY sort_order ASC').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const product = prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });
  res.json(product);
});

router.post('/', (req, res) => {
  const { name, size_ml, price_boutique, price_abonne, price_pro, is_featured, is_b2b, active } = req.body;
  if (!name || !size_ml) return res.status(400).json({ error: 'Nom et taille requis' });

  const result = prepare(`
    INSERT INTO products (name, size_ml, price_boutique, price_abonne, price_pro, is_featured, is_b2b, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, size_ml, price_boutique || null, price_abonne || null, price_pro || null, is_featured ? 1 : 0, is_b2b ? 1 : 0, active !== undefined ? (active ? 1 : 0) : 1);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Produit créé' });
});

router.put('/:id', (req, res) => {
  const existing = prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Produit introuvable' });

  const { name, size_ml, price_boutique, price_abonne, price_pro, is_featured, is_b2b, active } = req.body;
  prepare(`
    UPDATE products SET name=?, size_ml=?, price_boutique=?, price_abonne=?, price_pro=?, is_featured=?, is_b2b=?, active=?
    WHERE id=?
  `).run(
    name || existing.name,
    size_ml || existing.size_ml,
    price_boutique !== undefined ? price_boutique : existing.price_boutique,
    price_abonne !== undefined ? price_abonne : existing.price_abonne,
    price_pro !== undefined ? price_pro : existing.price_pro,
    is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
    is_b2b !== undefined ? (is_b2b ? 1 : 0) : existing.is_b2b,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    req.params.id
  );
  res.json({ message: 'Produit mis à jour' });
});

router.delete('/:id', (req, res) => {
  prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ message: 'Produit supprimé' });
});

module.exports = router;
