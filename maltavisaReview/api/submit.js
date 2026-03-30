import { Redis } from '@upstash/redis';
const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

export default async function handler(req, res) {
  // Allow cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, answers } = req.body;

    if (!name || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    const entry = {
      id: Date.now().toString(),
      name: name.trim(),
      answers,
      timestamp: new Date().toISOString()
    };

    // Push entry into a Redis list
    await kv.lpush('malta:entries', JSON.stringify(entry));

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Submit error:', err);
    return res.status(500).json({ error: 'Failed to save entry' });
  }
}