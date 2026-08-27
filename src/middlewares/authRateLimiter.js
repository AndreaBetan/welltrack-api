const { rateLimit } = require('express-rate-limit');

const commonOptions = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
};

// Limita los intentos de contraseña por dirección IP. En un despliegue con
// varias instancias, el almacén en memoria debe sustituirse por Redis.
const loginRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  // Los accesos correctos no consumen el cupo destinado a frenar intentos de
  // adivinación de contraseñas.
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Inténtalo más tarde',
  },
});

// El alta tiene un límite más estricto para dificultar la creación masiva de
// cuentas y el agotamiento de recursos mediante bcrypt.
const registerRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    message: 'Se han creado demasiadas cuentas desde esta conexión. Inténtalo más tarde',
  },
});

const passwordResetRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    message: 'Se han realizado demasiadas solicitudes. Inténtalo más tarde',
  },
});

module.exports = {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
};
