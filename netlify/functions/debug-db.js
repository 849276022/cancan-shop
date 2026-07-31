const { Pool } = require('pg');

const FIXED_TOKEN = 'king-dating-jwt-secret-2026';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_MNyJlfO19Erx@ep-lively-water-aqonh1o6-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (token !== FIXED_TOKEN) return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };

  const result = {};
  
  try {
    // 检查所有表
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    result.tables = tables.rows.map(r => r.table_name);
  } catch (e) {
    result.tablesError = e.message;
  }
  
  try {
    // 检查 persons 表
    const persons = await pool.query('SELECT COUNT(*) FROM persons');
    result.personsCount = persons.rows[0].count;
  } catch (e) {
    result.personsError = e.message;
  }
  
  try {
    // 检查 abnormal_passengers 表
    const abnormal = await pool.query('SELECT COUNT(*) FROM abnormal_passengers');
    result.abnormalCount = abnormal.rows[0].count;
  } catch (e) {
    result.abnormalError = e.message;
  }
  
  try {
    // 检查 persons 表结构
    const columns = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='persons' ORDER BY ordinal_position");
    result.personsColumns = columns.rows;
  } catch (e) {
    result.personsColumnsError = e.message;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, debug: result })
  };
};
