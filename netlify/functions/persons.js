const { Pool } = require('pg');

const FIXED_TOKEN = 'king-d…2026';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_MNyJlfO19Erx@ep-lively-water-aqonh1o6-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: JSON.stringify({ success: false, error: '方法不允许' }) };
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (token !== FIXED_TOKEN) return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };
  try {
    const result = await pool.query('SELECT id, name, gender, id_card, phone, location, status, description, reporter, report_time, created_at, updated_at FROM persons ORDER BY created_at DESC');
    const rows = result.rows.map(r => ({
      ...r,
      photo_url: r.photo_url ? String(r.photo_url) : null
    }));
    return { statusCode: 200, body: JSON.stringify({ success: true, data: rows }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
