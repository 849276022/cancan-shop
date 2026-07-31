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

  const debugInfo = {};

  try {
    // 1. 检查表结构
    const columns = await pool.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'persons'
      ORDER BY ordinal_position
    `);
    debugInfo.columns = columns.rows;

    // 2. 尝试查询单条数据
    try {
      const single = await pool.query('SELECT * FROM persons LIMIT 1');
      debugInfo.singleRow = single.rows[0];
      debugInfo.singleRowTypes = {};
      if (single.rows[0]) {
        for (const [key, value] of Object.entries(single.rows[0])) {
          debugInfo.singleRowTypes[key] = {
            type: typeof value,
            isBuffer: Buffer.isBuffer(value),
            constructor: value?.constructor?.name
          };
        }
      }
    } catch (e) {
      debugInfo.singleRowError = e.message;
    }

    // 3. 尝试查询所有数据
    try {
      const all = await pool.query('SELECT * FROM persons ORDER BY created_at DESC');
      debugInfo.totalRows = all.rows.length;
      
      // 尝试序列化
      try {
        const serialized = JSON.stringify(all.rows);
        debugInfo.serializationSuccess = true;
        debugInfo.serializedLength = serialized.length;
      } catch (e) {
        debugInfo.serializationSuccess = false;
        debugInfo.serializationError = e.message;
      }
    } catch (e) {
      debugInfo.allRowsError = e.message;
    }

    // 4. 尝试只查询文本字段
    try {
      const textOnly = await pool.query(`
        SELECT id, name, gender, id_card, phone, location, status, description, reporter, report_time, created_at, updated_at
        FROM persons 
        ORDER BY created_at DESC
      `);
      debugInfo.textOnlySuccess = true;
      debugInfo.textOnlyRows = textOnly.rows.length;
    } catch (e) {
      debugInfo.textOnlySuccess = false;
      debugInfo.textOnlyError = e.message;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, debug: debugInfo })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message, debug: debugInfo })
    };
  }
};
