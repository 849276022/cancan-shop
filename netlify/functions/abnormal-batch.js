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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const user = auth(event);
  if (!user) return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };

  const client = await pool.connect();
  
  try {
    const { items } = JSON.parse(event.body);
    if (!Array.isArray(items)) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: '数据格式错误' }) };
    }

    // 使用事务批量插入，大幅提升性能
    await client.query('BEGIN');
    
    // 分批处理，每批100条
    const batchSize = 100;
    let count = 0;
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // 构建批量 INSERT 语句
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      for (const item of batch) {
        placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        values.push(
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
        );
      }
      
      const sql = `
        INSERT INTO abnormal_passengers 
        (station, occur_time, name, gender, abnormal_behavior, phone, citizen_card, 
         common_exit, has_family, help_type, photo_url, incident_desc, created_by)
        VALUES ${placeholders.join(', ')}
      `;
      
      await client.query(sql, values);
      count += batch.length;
    }
    
    await client.query('COMMIT');
    
    return { statusCode: 200, body: JSON.stringify({ success: true, count }) };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Abnormal batch import error:', err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  } finally {
    client.release();
  }
};
