const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'lost-person-secret-key-2026';

exports.handler = async (event, context) => {
  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 200, body: JSON.stringify({ success: false, valid: false }) };
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, valid: true, user: decoded })
    };
  } catch (err) {
    return { statusCode: 200, body: JSON.stringify({ success: false, valid: false }) };
  }
};
