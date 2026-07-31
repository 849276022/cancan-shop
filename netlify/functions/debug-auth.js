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
      jwtSecretUsed: JWT_SECRET,
      jwtSecretLength: JWT_SECRET.length,
      envJwtSecret: process.env.JWT_SECRET || '(not set)',
      authHeaderPrefix: authHeader.substring(0, 10),
      tokenLength: token.length,
      verifyError: verifyError,
      decoded: decoded
    })
  };
};
