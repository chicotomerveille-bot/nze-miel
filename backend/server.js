const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { initDb, close } = require('./db');

const productsRouter = require('./routes/products');
const customersRouter = require('./routes/customers');
const ordersRouter = require('./routes/orders');
const subscriptionsRouter = require('./routes/subscriptions');
const { addClient } = require('./events');

async function start() {
  await initDb();

  const app = express();
  const PORT = process.env.PORT || 3000;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nze2026';

  app.use(cors());
  app.use(express.json());

  // Rate limiting
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: 'Trop de requêtes' } }));

  // SSE endpoint – temps réel
  app.get('/api/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    addClient(res);
  });

  // Routes API
  app.use('/api/products', productsRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/subscriptions', subscriptionsRouter);

  // Auth token
  const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

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

  // Login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    if (username === 'admin' && password === ADMIN_PASSWORD) {
      const token = generateToken();
      return res.json({ token, user: { username: 'admin', role: 'admin' } });
    }
    return res.status(401).json({ error: 'Identifiants incorrects' });
  });

  app.get('/api/auth/verify', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ valid: false });
    const payload = verifyToken(auth.slice(7));
    if (!payload) return res.status(401).json({ valid: false });
    res.json({ valid: true, user: payload.user });
  });

  function adminAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const payload = verifyToken(auth.slice(7));
      if (payload) return next();
    }
    const basic = req.headers.authorization;
    if (basic && basic.startsWith('Basic ')) {
      const decoded = Buffer.from(basic.split(' ')[1], 'base64').toString('utf8');
      const [user, pass] = decoded.split(':');
      if (user === 'admin' && pass === ADMIN_PASSWORD) return next();
    }
    res.status(401).json({ error: 'Authentification requise', login: true });
  }

  // Pages admin
  app.get('/admin', adminAuth, (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
  app.get('/admin/*', adminAuth, (req, res) => res.sendFile(path.join(__dirname, 'admin', req.params[0] || 'index.html')));

  // Outil admin (SPA avec login)
  app.get('/outil', (req, res) => res.sendFile(path.join(__dirname, '..', 'outil', 'login.html')));
  app.get('/outil/', (req, res) => res.sendFile(path.join(__dirname, '..', 'outil', 'login.html')));
  app.use('/outil', express.static(path.join(__dirname, '..', 'outil')));

  // Frontend
  app.use(express.static(path.join(__dirname, '..')));
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));

  // WhatsApp link generator
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
  app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.listen(PORT, () => {
    console.log(`\n  🐝 Nzé – Miel du Bénin (backend)`);
    console.log(`  ───────────────────────────────`);
    console.log(`  🌐 Site :    http://localhost:${PORT}`);
    console.log(`  🔧 Admin :  http://localhost:${PORT}/admin`);
    console.log(`  📡 API :    http://localhost:${PORT}/api/health`);
    console.log(`  ───────────────────────────────\n`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => { close(); process.exit(); });
  process.on('SIGTERM', () => { close(); process.exit(); });
}

start().catch(err => {
  console.error('Erreur au démarrage:', err);
  process.exit(1);
});
