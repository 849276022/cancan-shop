const { Pool } = require('pg');

const FIXED_TOKEN = 'king-dating-jwt-secret-2026';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_MNyJlfO19Erx@ep-lively-water-aqonh1o6-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
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
    // 列表禁止 SELECT *：photo_url 是数 MB 的 Base64 图片，会超过 Netlify 响应大小限制并触发 502。
    const result = await pool.query(`
      SELECT id, name, age, gender, height, weight,
             last_seen_location, last_seen_time, description,
             status, created_by, created_at, updated_at,
             id_card, found_time, found_location, station,
             family_name, family_phone, family_relation, family_address, remark
      FROM public.persons
      ORDER BY created_at DESC
    `);
    const data = result.rows.map(r => ({
      id: r.id, name: r.name, age: r.age, gender: r.gender,
      height: r.height, weight: r.weight,
      lastSeenLocation: r.last_seen_location, lastSeenTime: r.last_seen_time,
      description: r.description, status: r.status, createdBy: r.created_by,
      createdAt: r.created_at, updatedAt: r.updated_at,
      idCard: r.id_card, foundTime: r.found_time, foundLocation: r.found_location,
      station: r.station, familyName: r.family_name, familyPhone: r.family_phone,
      familyRelation: r.family_relation, familyAddress: r.family_address,
      remark: r.remark,
      // 列表不传大图片；详情图片后续通过独立接口按需获取。
      photoUrl: null
    }));
    return { statusCode: 200, body: JSON.stringify({ success: true, data }) };
  } catch (error) {
    console.error('persons list error:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
