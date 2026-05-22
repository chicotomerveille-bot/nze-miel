-- Nzé – Base de données e-commerce

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  city TEXT DEFAULT 'Cotonou',
  neighborhood TEXT,
  is_vip INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', '+1 hour')),
  FOREIGN KEY (referred_by) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  customer_name TEXT,
  customer_phone TEXT,
  product_id INTEGER,
  product_name TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price INTEGER,
  total INTEGER,
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'whatsapp',
  neighborhood TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', '+1 hour')),
  updated_at TEXT DEFAULT (datetime('now', '+1 hour')),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  customer_name TEXT,
  customer_phone TEXT,
  product_id INTEGER,
  size_ml INTEGER NOT NULL,
  price INTEGER NOT NULL,
  frequency TEXT DEFAULT 'monthly',
  status TEXT DEFAULT 'active',
  prepaid_months INTEGER DEFAULT 0,
  deliveries_made INTEGER DEFAULT 0,
  start_date TEXT DEFAULT (datetime('now', '+1 hour')),
  next_delivery TEXT,
  last_delivery TEXT,
  created_at TEXT DEFAULT (datetime('now', '+1 hour')),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS loyalty_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  action TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now', '+1 hour')),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id INTEGER NOT NULL,
  referred_id INTEGER NOT NULL,
  reward_given INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', '+1 hour')),
  FOREIGN KEY (referrer_id) REFERENCES customers(id),
  FOREIGN KEY (referred_id) REFERENCES customers(id)
);
