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
      const values = records.map(r => [r.station, r.occurrence_time, r.name, r.gender, r.abnormal_behavior, r.contact_phone, r.citizen_card, r.frequent_exit, r.has_family, r.help_features, r.passenger_photo, r.event_description]).flat();
      const placeholders = records.map((_, i) => `(${i*12+1},${i*12+2},${i*12+3},${i*12+4},${i*12+5},${i*12+6},${i*12+7},${i*12+8},${i*12+9},${i*12+10},${i*12+11},${i*12+12})`).join(',');
      const query = `INSERT INTO abnormal_passengers (station, occurrence_time, name, gender, abnormal_behavior, contact_phone, citizen_card, frequent_exit, has_family, help_features, passenger_photo, event_description) VALUES ${placeholders}`;
      await client.query(query, values);
      await client.query('COMMIT');
      return { statusCode: 200, body: JSON.stringify({ success: true, count: records.length }) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
