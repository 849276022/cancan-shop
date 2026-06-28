const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || 'lost-person-secret-key-2026';

exports.handler = async (event, context) => {
  if (event.httpMethod === 'POST') {
    try {
      const { username, password } = JSON.parse(event.body);
      
      // Debug: check if DATABASE_URL is set
      if (!process.env.DATABASE_URL) {
        return { statusCode: 500, body: JSON.stringify({ success: false, error: 'DATABASE_URL not set' }) };
      }
      
      const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
      
      if (result.rows.length === 0) {
        return { statusCode: 200, body: JSON.stringify({ success: false, error: '用户不存在' }) };
      }
      
      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return { statusCode: 200, body: JSON.stringify({ success: false, error: '密码错误' }) };
      }
      
      const token = jwt.sign(
        { id: user.id, username: user.username, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          token,
          user: { id: user.id, username: user.username, nickname: user.nickname, role: 'admin' }
        })
      };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
    }
  }
  
  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
