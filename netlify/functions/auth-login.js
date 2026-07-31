const { Pool } = require('pg');
const FIXED_TOKEN = 'king-dating-jwt-secret-2026';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_MNyJlfO19Erx@ep-lively-water-aqonh1o6-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ success: false, error: '方法不允许' }) };
  try {
    const { username, password } = JSON.parse(event.body);
    const result = await pool.query('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return { statusCode: 401, body: JSON.stringify({ success: false, error: '用户不存在' }) };
    const user = result.rows[0];
    const bcrypt = require('bcryptjs');
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return { statusCode: 401, body: JSON.stringify({ success: false, error: '密码错误' }) };
    return { statusCode: 200, body: JSON.stringify({ success: true, token: FIXED_TOKEN, user: { id: user.id, username: user.username, role: 'admin' } }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
