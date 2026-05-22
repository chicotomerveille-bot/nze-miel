-- Nzé – Données initiales pour Supabase
-- Run this AFTER creating the tables

-- Produits
INSERT INTO products (id, name, size_ml, price_boutique, price_abonne, price_pro, is_featured, is_b2b, sort_order) VALUES
  (1, 'Nzé 250ml', 250, 2500, 1800, NULL, 0, 0, 1),
  (2, 'Nzé 500ml', 500, 4000, 3200, NULL, 1, 0, 2),
  (3, 'Nzé 1 Litre', 1000, 7000, 6000, NULL, 0, 0, 3),
  (4, 'Nzé 2 Litres', 2000, NULL, 10500, NULL, 0, 0, 4),
  (5, 'Nzé 5 Litres (Vrac)', 5000, NULL, NULL, 25000, 0, 1, 5)
ON CONFLICT (id) DO NOTHING;

-- Clients
INSERT INTO customers (id, name, phone, city, neighborhood, purchase_count, is_vip, referral_code) VALUES
  (1, 'Mariam Bello', '+22961112233', 'Cotonou', 'Cadjehoun', 6, 1, 'PARRAIN-2233'),
  (2, 'Thomas Adjovi', '+22962223344', 'Porto-Novo', 'Ahomey', 3, 1, 'PARRAIN-3344'),
  (3, 'Fatimatou Zinsou', '+22963334455', 'Parakou', 'Ara', 4, 0, 'PARRAIN-4455'),
  (4, 'Dr. Paulin Agossou', '+22964445566', 'Porto-Novo', 'Houeme', 8, 1, 'PARRAIN-5566'),
  (5, 'Sophie Kounkou', '+22965556677', 'Cotonou', 'Fidjrosse', 2, 0, 'PARRAIN-6677')
ON CONFLICT (id) DO NOTHING;

-- Commandes
INSERT INTO orders (customer_id, customer_name, customer_phone, product_id, product_name, quantity, unit_price, total, status, neighborhood) VALUES
  (1, 'Mariam Bello', '+22961112233', 2, 'Nzé 500ml', 1, 4000, 4000, 'delivered', 'Cadjehoun'),
  (1, 'Mariam Bello', '+22961112233', 2, 'Nzé 500ml', 1, 3200, 3200, 'delivered', 'Cadjehoun'),
  (2, 'Thomas Adjovi', '+22962223344', 3, 'Nzé 1 Litre', 2, 7000, 14000, 'delivered', 'Ahomey'),
  (3, 'Fatimatou Zinsou', '+22963334455', 2, 'Nzé 500ml', 1, 4000, 4000, 'pending', 'Ara'),
  (4, 'Dr. Paulin Agossou', '+22964445566', 3, 'Nzé 1 Litre', 1, 7000, 7000, 'delivered', 'Houeme');

-- Abonnements
INSERT INTO subscriptions (customer_id, customer_name, customer_phone, product_id, size_ml, price, status, deliveries_made, next_delivery) VALUES
  (1, 'Mariam Bello', '+22961112233', 2, 500, 3200, 'active', 3, CURRENT_DATE + INTERVAL '1 month'),
  (3, 'Fatimatou Zinsou', '+22963334455', 3, 1000, 6000, 'active', 1, CURRENT_DATE + INTERVAL '1 month'),
  (4, 'Dr. Paulin Agossou', '+22964445566', 2, 500, 3200, 'active', 6, CURRENT_DATE + INTERVAL '1 month');

-- Reset sequence to avoid future conflicts
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));
SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));
SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));
SELECT setval('subscriptions_id_seq', (SELECT MAX(id) FROM subscriptions));
