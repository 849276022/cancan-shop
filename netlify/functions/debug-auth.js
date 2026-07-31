const jwt = require('jsonwebtoken');

const JWT_SECRET = 'king-dating-jwt-secret-2026';

exports.handler = async (event) => {
  const headers = event.headers || {};
  const authHeader = headers.authorization || headers.Authorization || '';
  const token = authHeader.replace('Bearer ', '');
  
  let decoded = null;
  let verifyError = null;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    verifyError = e.message;
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      authHeader: authHeader.substring(0, 50),
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20),
      jwtSecret: JWT_SECRET,
      decoded: decoded,
      verifyError: verifyError,
      allHeaders: Object.keys(headers)
    })
  };
};
