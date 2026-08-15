const { Router } = require('express');

const authController = require('./auth.controller');

const router = Router();

// Estas rutas son públicas porque todavía no existe un token que validar.
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
