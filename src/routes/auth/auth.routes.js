const { Router } = require('express');

const authController = require('./auth.controller');
const {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
} = require('../../middlewares/authRateLimiter');

const router = Router();

// Estas rutas son públicas porque todavía no existe un token que validar.
router.post('/register', registerRateLimiter, authController.register);
router.post('/login', loginRateLimiter, authController.login);
router.post('/forgot-password', passwordResetRateLimiter, authController.requestPasswordReset);
router.post('/reset-password', passwordResetRateLimiter, authController.resetPassword);

module.exports = router;
