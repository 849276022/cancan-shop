const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const FIXED_TOKEN = 'king-dating-jwt-secret-2026';

function auth(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  return header.replace(/^Bearer\s+/i, '') === FIXED_TOKEN;
}

exports.handler = async (event) => {
  const authenticated = auth(event);
  if (!authenticated) return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };

  try {
    const { name, gender, age, idCard, foundTime, foundLocation, status, station,
            familyName, familyPhone, familyRelation, familyAddress, photoUrl, remark } = JSON.parse(event.body);
    
    const result = await pool.query(`
      INSERT INTO persons (name, gender, age, id_card, found_time, found_location, status, station,
        family_name, family_phone, family_relation, family_address, photo_url, remark, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [name, gender, age, idCard, foundTime, foundLocation, status, station,
        familyName, familyPhone, familyRelation, familyAddress, photoUrl, remark, 1]);
    
    return { statusCode: 200, body: JSON.stringify({ success: true, data: result.rows[0] }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
