const AppError = require('../utils/AppError');

const WINDOW_MS = 60 * 1000;
const requestsByUser = new Map();

// Limita el uso del proxy externo por usuario autenticado. En producción con
// varias instancias esta información debería moverse a Redis para compartirla.
const foodRateLimiter = (req, res, next) => {
  const configuredLimit = Number(process.env.FOOD_RATE_LIMIT_PER_MINUTE);
  const maximumRequests = Number.isInteger(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : 8;
  const now = Date.now();
  const currentWindow = requestsByUser.get(req.userId);

  if (!currentWindow || currentWindow.resetAt <= now) {
    requestsByUser.set(req.userId, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    res.set('X-RateLimit-Limit', String(maximumRequests));
    res.set('X-RateLimit-Remaining', String(maximumRequests - 1));
    return next();
  }

  const remaining = Math.max(0, maximumRequests - currentWindow.count - 1);
  res.set('X-RateLimit-Limit', String(maximumRequests));
  res.set('X-RateLimit-Reset', String(Math.ceil(currentWindow.resetAt / 1000)));

  if (currentWindow.count >= maximumRequests) {
    res.set('X-RateLimit-Remaining', '0');
    res.set('Retry-After', String(Math.ceil((currentWindow.resetAt - now) / 1000)));
    return next(new AppError(
      'Has realizado demasiadas consultas de alimentos. Inténtalo de nuevo en unos segundos',
      429
    ));
  }

  currentWindow.count += 1;
  res.set('X-RateLimit-Remaining', String(remaining));
  return next();
};

module.exports = foodRateLimiter;
