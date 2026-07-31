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
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const user = auth(event);
  if (!user) return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };

  try {
    const result = await pool.query(`
      SELECT id, station, occur_time, name, gender, abnormal_behavior, phone, 
             citizen_card, common_exit, has_family, help_type, photo_url, 
             incident_desc, created_at
      FROM abnormal_passengers
      ORDER BY created_at DESC
    `);

    const data = result.rows.map(row => ({
      id: row.id,
      station: row.station,
      occurTime: row.occur_time,
      name: row.name,
      gender: row.gender,
      abnormalBehavior: row.abnormal_behavior,
      phone: row.phone,
      citizenCard: row.citizen_card,
      commonExit: row.common_exit,
      hasFamily: row.has_family,
      helpType: row.help_type,
      photoUrl: row.photo_url,
      incidentDesc: row.incident_desc,
      createdAt: row.created_at
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data })
    };
  } catch (err) {
    console.error('Abnormal list error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
