const { Pool } = require('pg');

const FIXED_TOKEN = 'king-dating-jwt-secret-2026';
const pool = new Pool({
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

  // 同时兼容 Netlify 重写后的查询参数和动态路径。
  const id = event.queryStringParameters?.id || (event.path || '').match(/\/persons\/(\d+)(?:\/photo)?(?:\/|$)/)?.[1];
  if (!id || !/^\d+$/.test(id)) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: '人员编号无效' }) };
  }

  try {
    const result = await pool.query(
      'SELECT photo_url FROM public.persons WHERE id = $1 LIMIT 1',
      [Number(id)]
    );
    if (!result.rows.length) {
      return { statusCode: 404, body: JSON.stringify({ success: false, error: '人员不存在' }) };
    }
    return {
      statusCode: 200,
      headers: { 'Cache-Control': 'private, max-age=300' },
      body: JSON.stringify({ success: true, photoUrl: result.rows[0].photo_url || null })
    };
  } catch (error) {
    console.error('persons photo error:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
