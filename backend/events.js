// SSE temps réel – file d'attente de notifications
const clients = new Map();
let nextId = 0;

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [id, res] of clients) {
    try { res.write(msg); } catch { clients.delete(id); }
  }
}

function addClient(res) {
  const id = ++nextId;
  res.write(`event: connected\ndata: ${JSON.stringify({ id, time: new Date().toISOString() })}\n\n`);
  clients.set(id, res);
  const keepalive = setInterval(() => {
    try { res.write(':keepalive\n\n'); } catch { clearInterval(keepalive); }
  }, 30000);
  res.on('close', () => { clearInterval(keepalive); clients.delete(id); });
  return id;
}

module.exports = { broadcast, addClient };
