const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || 'lost-person-secret-key-2026';

function auth(event) {
  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

exports.handler = async (event) => {
  const user = auth(event);
  if (!user) return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };

  try {
    const stationStats = await pool.query(`
      SELECT station as name, COUNT(*) as value FROM persons 
      WHERE station IS NOT NULL GROUP BY station ORDER BY value DESC LIMIT 10
    `);
    
    const statusStats = await pool.query(`
      SELECT status as name, COUNT(*) as value FROM persons GROUP BY status ORDER BY value DESC
    `);
    
    const typeStats = await pool.query(`
      SELECT type as name, COUNT(*) as value FROM records GROUP BY type ORDER BY value DESC
    `);
    
    const trendStats = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as value FROM persons 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at) ORDER BY date
    `);
    
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_persons,
        COUNT(CASE WHEN status = '待核实' THEN 1 END) as pending,
        COUNT(CASE WHEN status = '已找到家属' THEN 1 END) as found
      FROM persons
    `);
    
    const recordCount = await pool.query('SELECT COUNT(*) as total FROM records');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          stationStats: stationStats.rows,
          statusStats: statusStats.rows,
          typeStats: typeStats.rows,
          trendStats: trendStats.rows.map(r => ({ name: r.date, value: parseInt(r.value) })),
          summary: {
            totalPersons: parseInt(summary.rows[0].total_persons),
            pending: parseInt(summary.rows[0].pending),
            found: parseInt(summary.rows[0].found),
            totalRecords: parseInt(recordCount.rows[0].total)
          }
        }
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
