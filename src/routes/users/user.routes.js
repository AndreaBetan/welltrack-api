const { Router } = require('express');

const authenticate = require('../../middlewares/authenticate');
const userController = require('./user.controller');

const router = Router();

// Middleware de router: todas las rutas declaradas después requieren JWT.
router.use(authenticate);

// /me actúa siempre sobre el usuario identificado por el token, no por un ID
// recibido del cliente. Esto evita que un usuario modifique otro perfil.
router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);
router.get('/', userController.getUsers);

module.exports = router;
