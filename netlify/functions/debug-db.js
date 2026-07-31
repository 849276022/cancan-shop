const { Pool } = require('pg');

const FIXED_TOKEN = 'king-d…2026';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_MNyJlfO19Erx@ep-lively-water-aqonh1o6-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (token !== FIXED_TOKEN) return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };

  try {
    // 检查 persons 表结构
    const columns = await pool.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='persons' ORDER BY ordinal_position");
    
    // 尝试查询数据
    const data = await pool.query('SELECT * FROM persons LIMIT 3');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        columns: columns.rows,
        sampleData: data.rows,
        dataTypes: data.rows[0] ? Object.keys(data.rows[0]).map(k => ({ key: k, type: typeof data.rows[0][k] })) : []
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};
