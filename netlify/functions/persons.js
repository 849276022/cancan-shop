const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = 'king-dating-jwt-secret-2026';

function auth(event) {
  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

// snake_case → camelCase 转换
function toCamelCase(r) {
  return {
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
  };
}

exports.handler = async (event, context) => {
  const user = auth(event);
  if (!user) return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };

  const method = event.httpMethod;
  const path = event.path || '';
  // 从查询参数或 URL 提取 id: /api/persons/123 → id=123
  const queryParams = event.queryStringParameters || {};
  let id = queryParams.id || null;
  if (!id) {
    const idMatch = path.match(/\/persons\/(\d+)/);
    id = idMatch ? idMatch[1] : null;
  }
  
  // GET /api/persons - 列表
  if (method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM persons ORDER BY created_at DESC');
      const data = result.rows.map(toCamelCase);
      return { statusCode: 200, body: JSON.stringify({ success: true, data }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
    }
  }
  
  // POST /api/persons - 创建
  if (method === 'POST' && !path.includes('/batch')) {
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
      
      return { statusCode: 200, body: JSON.stringify({ success: true, data: toCamelCase(result.rows[0]) }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
    }
  }
  
  // PUT /api/persons/:id - 更新
  if (method === 'PUT') {
    try {
      const { name, gender, age, idCard, foundTime, foundLocation, status, station,
              familyName, familyPhone, familyRelation, familyAddress, photoUrl, remark } = JSON.parse(event.body);
      
      const result = await pool.query(`
        UPDATE persons SET name=$1, gender=$2, age=$3, id_card=$4, found_time=$5, found_location=$6,
          status=$7, station=$8, family_name=$9, family_phone=$10, family_relation=$11,
          family_address=$12, photo_url=$13, remark=$14, updated_at=CURRENT_TIMESTAMP
        WHERE id=$15 RETURNING *
      `, [name, gender, age, idCard, foundTime, foundLocation, status, station,
          familyName, familyPhone, familyRelation, familyAddress, photoUrl, remark, id]);
      
      return { statusCode: 200, body: JSON.stringify({ success: true, data: toCamelCase(result.rows[0]) }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
    }
  }
  
  // DELETE /api/persons/:id - 删除
  if (method === 'DELETE') {
    try {
      await pool.query('DELETE FROM persons WHERE id = $1', [id]);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
    }
  }
  
  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
