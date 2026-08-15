const jwt = require('jsonwebtoken');

const AppError = require('../utils/AppError');

// Middleware que protege rutas y transforma un Bearer token en req.userId.
const authenticate = (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return next(new Error('JWT_SECRET no está configurado'));
  }

  const authorization = req.headers.authorization;

  // Formato esperado: Authorization: Bearer <token>.
  if (!authorization?.startsWith('Bearer ')) {
    return next(new AppError('Autenticación requerida', 401));
  }

  const token = authorization.slice(7);

  try {
    // verify valida simultáneamente firma, expiración, algoritmo, emisor y
    // audiencia. Decodificar el token sin verificarlo no sería seguro.
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: process.env.JWT_ISSUER || 'welltrack-api',
      audience: process.env.JWT_AUDIENCE || 'welltrack-client',
    });

    // sub (subject) contiene el identificador del usuario autenticado.
    req.userId = payload.sub;

    return next();
  } catch (error) {
    return next(new AppError('Token inválido o expirado', 401));
  }
};

module.exports = authenticate;
