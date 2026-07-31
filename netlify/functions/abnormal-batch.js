const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || 'lost-person-secret-key-2026';

function auth(event) {
  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const user = auth(event);
  if (!user) return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };

  try {
    const { items } = JSON.parse(event.body);
    if (!Array.isArray(items)) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: '数据格式错误' }) };
    }

    let count = 0;
    for (const item of items) {
      await pool.query(`
        INSERT INTO abnormal_passengers 
        (station, occur_time, name, gender, abnormal_behavior, phone, citizen_card, 
         common_exit, has_family, help_type, photo_url, incident_desc, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        item.station || null,
        item.occurTime || null,
        item.name || null,
        item.gender || null,
        item.abnormalBehavior || null,
        item.phone || null,
        item.citizenCard || null,
        item.commonExit || null,
        item.hasFamily || null,
        item.helpType || null,
        item.photoUrl || null,
        item.incidentDesc || null,
        user.id
      ]);
      count++;
    }
    
    return { statusCode: 200, body: JSON.stringify({ success: true, count }) };
  } catch (err) {
    console.error('Abnormal batch import error:', err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
