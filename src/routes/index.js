const { Router } = require('express');

const authRoutes = require('./auth/auth.routes');
const healthRoutes = require('./health');
const userRoutes = require('./users/user.routes');

const router = Router();

// Este router compone los módulos y define el prefijo de cada dominio.
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/users', userRoutes);

module.exports = router;
