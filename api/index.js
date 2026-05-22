const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { pool } = require('./db');
const productsRouter = require('./routes/products');
const customersRouter = require('./routes/customers');
const ordersRouter = require('./routes/orders');
const subscriptionsRouter = require('./routes/subscriptions');
const { addClient } = require('./events');

const app = express();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nze2026';
const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

function generateToken() {
  const payload = { user: 'admin', role: 'admin', exp: Date.now() + 24 * 60 * 60 * 1000 };
  const data = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('hex');
  return Buffer.from(data).toString('base64') + '.' + hmac;
}

function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const data = Buffer.from(parts[0], 'base64').toString('utf8');
    const payload = JSON.parse(data);
    const hmac = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('hex');
    if (hmac !== parts[1] || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

function adminAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    if (verifyToken(auth.slice(7))) return next();
  }
  if (auth && auth.startsWith('Basic ')) {
    const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString('utf8');
    const [user, pass] = decoded.split(':');
    if (user === 'admin' && pass === ADMIN_PASSWORD) return next();
  }
  res.status(401).json({ error: 'Authentification requise', login: true });
}

// SSE
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  addClient(res);
});

// Auth
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === 'admin' && password === ADMIN_PASSWORD) {
    return res.json({ token: generateToken(), user: { username: 'admin', role: 'admin' } });
  }
  res.status(401).json({ error: 'Identifiants incorrects' });
});

app.get('/api/auth/verify', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ valid: false });
  res.json({ valid: !!verifyToken(auth.slice(7)) });
});

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/subscriptions', subscriptionsRouter);

// WhatsApp
app.get('/api/whatsapp/generate', (req, res) => {
  const { produit, quantite, nom, telephone, quartier } = req.query;
  const number = process.env.WHATSAPP_NUMBER || '229XXXXXXXX';
  let msg = 'Bonjour Nzé !';
  if (produit) msg += `\n\n📦 ${produit}`;
  if (quantite) msg += ` x${quantite}`;
  if (quartier) msg += `\n📍 Livraison : ${quartier}`;
  if (nom) msg += `\n👤 ${nom}`;
  if (telephone) msg += `\n📞 ${telephone}`;
  res.json({ url: `https://wa.me/${number}?text=${encodeURIComponent(msg)}`, message: msg });
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Admin pages (static fallback)
app.get('/admin', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'backend', 'admin', 'index.html'));
});

// Static frontend
app.use(express.static(path.join(__dirname, '..')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));

module.exports = app;
