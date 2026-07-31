const { Pool } = require('pg');

const FIXED_TOKEN = 'king-dating-jwt-secret-2026';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_MNyJlfO19Erx@ep-lively-water-aqonh1o6-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (token !== FIXED_TOKEN) {
    return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };
  }
  // Netlify 在重写动态路由时，不同运行时可能不会填充 queryStringParameters；两种方式都兼容。
  const id = event.queryStringParameters?.id || (event.path || '').match(/\/persons\/(\d+)(?:\/|$)/)?.[1];
  if (event.httpMethod === 'DELETE') {
    if (!id) return { statusCode: 400, body: JSON.stringify({ success: false, error: '缺少人员编号' }) };
    try {
      const result = await pool.query('DELETE FROM public.persons WHERE id=$1 RETURNING id', [id]);
      if (!result.rows.length) return { statusCode: 404, body: JSON.stringify({ success: false, error: '人员不存在' }) };
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (error) {
      console.error('persons delete error:', error);
      return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
  }
  if (event.httpMethod === 'PUT') {
    if (!id) return { statusCode: 400, body: JSON.stringify({ success: false, error: '缺少人员编号' }) };
    try {
      const body = JSON.parse(event.body || '{}');
      const result = await pool.query(`
        UPDATE public.persons SET name=$1, gender=$2, age=$3, id_card=$4, found_time=$5,
          found_location=$6, status=$7, station=$8, family_name=$9, family_phone=$10,
          family_relation=$11, family_address=$12, photo_url=$13, remark=$14,
          updated_at=CURRENT_TIMESTAMP
        WHERE id=$15 RETURNING *`, [
        body.name || '', body.gender || '', Number(body.age) || 0,
        body.idCard || '', body.foundTime || '', body.foundLocation || '',
        body.status || '待核实', body.station || '', body.familyName || '',
        body.familyPhone || '', body.familyRelation || '', body.familyAddress || '',
        body.photoUrl || null, body.remark || '', id
      ]);
      if (!result.rows.length) return { statusCode: 404, body: JSON.stringify({ success: false, error: '人员不存在' }) };
      return { statusCode: 200, body: JSON.stringify({ success: true, data: result.rows[0] }) };
    } catch (error) {
      console.error('persons update error:', error);
      return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: '方法不允许' }) };
  }
  try {
    // 与已验证正常的 abnormal-list 保持完全相同的连接、鉴权和返回路径。
    const result = await pool.query('SELECT * FROM persons ORDER BY created_at DESC');
    return { statusCode: 200, body: JSON.stringify({ success: true, data: result.rows }) };
  } catch (error) {
    console.error('persons error:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
