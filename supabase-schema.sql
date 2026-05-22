-- Nzé – PostgreSQL Schema (for Supabase)
-- Run this in Supabase SQL Editor after creating a project

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  city TEXT DEFAULT 'Cotonou',
  neighborhood TEXT,
  is_vip INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by INTEGER REFERENCES customers(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  size_ml INTEGER NOT NULL,
  price_boutique INTEGER,
  price_abonne INTEGER,
  price_pro INTEGER,
  is_featured INTEGER DEFAULT 0,
  is_b2b INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT,
  customer_phone TEXT,
  product_id INTEGER REFERENCES products(id),
  product_name TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price INTEGER,
  total INTEGER,
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'whatsapp',
  neighborhood TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  updated_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT,
  customer_phone TEXT,
  product_id INTEGER REFERENCES products(id),
  size_ml INTEGER NOT NULL,
  price INTEGER NOT NULL,
  frequency TEXT DEFAULT 'monthly',
  status TEXT DEFAULT 'active',
  prepaid_months INTEGER DEFAULT 0,
  deliveries_made INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  next_delivery DATE,
  last_delivery DATE,
  created_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);

CREATE TABLE IF NOT EXISTS loyalty_log (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);

CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES customers(id),
  referred_id INTEGER NOT NULL REFERENCES customers(id),
  reward_given INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);
