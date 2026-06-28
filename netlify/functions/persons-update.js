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
    const { id } = event.pathParameters || {};
    const { name, gender, age, idCard, foundTime, foundLocation, status, station,
            familyName, familyPhone, familyRelation, familyAddress, photoUrl, remark } = JSON.parse(event.body);
    
    const result = await pool.query(`
      UPDATE persons SET name=$1, gender=$2, age=$3, id_card=$4, found_time=$5, found_location=$6,
        status=$7, station=$8, family_name=$9, family_phone=$10, family_relation=$11,
        family_address=$12, photo_url=$13, remark=$14, updated_at=CURRENT_TIMESTAMP
      WHERE id=$15 RETURNING *
    `, [name, gender, age, idCard, foundTime, foundLocation, status, station,
        familyName, familyPhone, familyRelation, familyAddress, photoUrl, remark, id]);
    
    return { statusCode: 200, body: JSON.stringify({ success: true, data: result.rows[0] }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
