import { Redis } from '@upstash/redis';
const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

const ADMIN_PASSWORD = 'malta2025';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Check admin password from header
  const pw = req.headers['x-admin-password'];
  if (pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      // Fetch all entries (up to 500)
      const raw = await kv.lrange('malta:entries', 0, 499);
      const entries = raw.map(item => {
        try { return typeof item === 'string' ? JSON.parse(item) : item; }
        catch { return null; }
      }).filter(Boolean);
      return res.status(200).json({ entries });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing id' });

      // Get all entries, filter out the one to delete, rewrite list
      const raw = await kv.lrange('malta:entries', 0, 499);
      const entries = raw.map(item => {
        try { return typeof item === 'string' ? JSON.parse(item) : item; }
        catch { return null; }
      }).filter(Boolean);

      const remaining = entries.filter(e => e.id !== id);

      // Rewrite the list
      await kv.del('malta:entries');
      if (remaining.length > 0) {
        for (const entry of remaining.reverse()) {
          await kv.lpush('malta:entries', JSON.stringify(entry));
        }
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Results error:', err);
    return res.status(500).json({ error: 'Failed to fetch entries' });
  }
}