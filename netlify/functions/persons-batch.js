const { Pool } = require('pg');
const FIXED_TOKEN = 'king-dating-jwt-secret-2026';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_MNyJlfO19Erx@ep-lively-water-aqonh1o6-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ success: false, error: '方法不允许' }) };
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (token !== FIXED_TOKEN) return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };
  try {
    const { records } = JSON.parse(event.body);
    if (!Array.isArray(records) || records.length === 0) return { statusCode: 400, body: JSON.stringify({ success: false, error: '无效数据' }) };
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const values = records.map(r => [r.name, r.gender, r.id_card, r.phone, r.location, r.status, r.description, r.photo_url, r.reporter, r.report_time]).flat();
      const placeholders = records.map((_, i) => `(${i*10+1},${i*10+2},${i*10+3},${i*10+4},${i*10+5},${i*10+6},${i*10+7},${i*10+8},${i*10+9},${i*10+10})`).join(',');
      const query = `INSERT INTO persons (name, gender, id_card, phone, location, status, description, photo_url, reporter, report_time) VALUES ${placeholders}`;
      await client.query(query, values);
      await client.query('COMMIT');
      return { statusCode: 200, body: JSON.stringify({ success: true, count: records.length }) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
