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
  const user = auth(event);
  if (!user) return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };

  try {
    const result = await pool.query('SELECT * FROM persons ORDER BY created_at DESC');
    // snake_case → camelCase 转换
    const data = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      gender: r.gender,
      age: r.age,
      idCard: r.id_card,
      foundTime: r.found_time,
      foundLocation: r.found_location,
      status: r.status,
      station: r.station,
      familyName: r.family_name,
      familyPhone: r.family_phone,
      familyRelation: r.family_relation,
      familyAddress: r.family_address,
      photoUrl: r.photo_url,
      remark: r.remark,
      height: r.height,
      weight: r.weight,
      description: r.description,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    return { statusCode: 200, body: JSON.stringify({ success: true, data }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
