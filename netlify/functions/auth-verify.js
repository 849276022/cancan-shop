const FIXED_TOKEN = 'king-d…2026';
exports.handler = async (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (token === FIXED_TOKEN) return { statusCode: 200, body: JSON.stringify({ success: true, user: { id: 1, username: 'admin', role: 'admin' } }) };
  return { statusCode: 401, body: JSON.stringify({ success: false, error: '未登录' }) };
};
