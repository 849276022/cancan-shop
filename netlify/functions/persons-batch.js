const { Pool } = require('pg');
const FIXED_TOKEN = 'king-dating-jwt-secret-2026';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ success: false, error: '方法不允许' }) };
  const h = event.headers?.authorization || event.headers?.Authorization || '';
  if (h.replace(/^Bearer\s+/i, '') !== FIXED_TOKEN) return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };
  try {
    const body = JSON.parse(event.body || '{}');
    const records = body.items || body.records;
    if (!Array.isArray(records) || !records.length) return { statusCode: 400, body: JSON.stringify({ success: false, error: '无效数据' }) };
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const r of records) {
        await client.query(`INSERT INTO persons
          (name, gender, age, id_card, found_time, found_location, status, station,
           family_name, family_phone, family_relation, family_address, photo_url, remark)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, [
          r.name || '', r.gender || '', Number(r.age) || 0, r.idCard || r.id_card || '',
          r.foundTime || r.found_time || '', r.foundLocation || r.found_location || r.location || '',
          r.status || '待核实', r.station || '', r.familyName || r.family_name || '',
          r.familyPhone || r.family_phone || r.phone || '', r.familyRelation || r.family_relation || '',
          r.familyAddress || r.family_address || '', r.photoUrl || r.photo_url || null,
          r.remark || r.description || ''
        ]);
      }
      await client.query('COMMIT');
      return { statusCode: 200, body: JSON.stringify({ success: true, count: records.length }) };
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch (error) { console.error('persons batch error:', error); return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) }; }
};
