const COS = require('cos-nodejs-sdk-v5');

const FIXED_TOKEN = 'king-dating-jwt-secret-2026';
const cos = new COS({
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY
});

function auth(event) {
  const h = event.headers?.authorization || event.headers?.Authorization || '';
  return h.replace(/^Bearer\s+/i, '') === FIXED_TOKEN;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ success: false, error: '方法不允许' }) };
  if (!auth(event)) return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };
  try {
    const { dataUrl, personId } = JSON.parse(event.body || '{}');
    const m = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
    if (!m) return { statusCode: 400, body: JSON.stringify({ success: false, error: '只支持 JPG、PNG、WebP 图片' }) };
    const body = Buffer.from(m[2], 'base64');
    if (body.length > 3 * 1024 * 1024) return { statusCode: 413, body: JSON.stringify({ success: false, error: '压缩后图片仍超过3MB' }) };
    const ext = m[1].includes('png') ? 'png' : m[1].includes('webp') ? 'webp' : 'jpg';
    const key = `lost-persons/${personId || 'new'}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const result = await new Promise((resolve, reject) => cos.putObject({
      Bucket: process.env.COS_BUCKET,
      Region: process.env.COS_REGION,
      Key: key,
      Body: body,
      ContentType: m[1] === 'image/jpg' ? 'image/jpeg' : m[1]
    }, (err, data) => err ? reject(err) : resolve(data)));
    const url = `https://${process.env.COS_BUCKET}.cos.${process.env.COS_REGION}.myqcloud.com/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
    return { statusCode: 200, body: JSON.stringify({ success: true, url, etag: result.ETag }) };
  } catch (error) {
    console.error('COS upload error:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: '图片上传失败' }) };
  }
};
