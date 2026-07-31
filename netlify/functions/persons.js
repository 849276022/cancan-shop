const { Pool } = require('pg');

const FIXED_TOKEN = 'king-dating-jwt-secret-2026';
const pool = new Pool({
  // 与线上正常工作的 abnormal-list 使用相同连接方式。
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_MNyJlfO19Erx@ep-lively-water-aqonh1o6-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: '方法不允许' }) };
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (token !== FIXED_TOKEN) {
    return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };
  }

  try {
    // 使用实际 persons 表字段，避免查询不存在的旧字段导致 Netlify 函数 500/502。
    const result = await pool.query(`
      SELECT id, name, gender, age, id_card, found_time, found_location, status,
             station, family_name, family_phone, family_relation, family_address,
             photo_url, remark, height, weight, description, created_by, created_at, updated_at
      FROM persons ORDER BY created_at DESC
    `);
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
      photoUrl: r.photo_url == null ? null : String(r.photo_url),
      remark: r.remark,
      height: r.height,
      weight: r.weight,
      description: r.description,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    return { statusCode: 200, body: JSON.stringify({ success: true, data }) };
  } catch (error) {
    console.error('Persons list error:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
