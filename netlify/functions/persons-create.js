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
    const { name, gender, age, idCard, foundTime, foundLocation, status, station,
            familyName, familyPhone, familyRelation, familyAddress, photoUrl, remark } = JSON.parse(event.body);
    
    const result = await pool.query(`
      INSERT INTO persons (name, gender, age, id_card, found_time, found_location, status, station,
        family_name, family_phone, family_relation, family_address, photo_url, remark, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [name, gender, age, idCard, foundTime, foundLocation, status, station,
        familyName, familyPhone, familyRelation, familyAddress, photoUrl, remark, user.id]);
    
    return { statusCode: 200, body: JSON.stringify({ success: true, data: result.rows[0] }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
