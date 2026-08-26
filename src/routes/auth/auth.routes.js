const { Router } = require('express');

const authController = require('./auth.controller');
const {
  loginRateLimiter,
  registerRateLimiter,
} = require('../../middlewares/authRateLimiter');

const router = Router();

// Estas rutas son públicas porque todavía no existe un token que validar.
router.post('/register', registerRateLimiter, authController.register);
router.post('/login', loginRateLimiter, authController.login);

module.exports = router;
