const { Router } = require('express');

const authenticate = require('../../middlewares/authenticate');
const activityController = require('./activity.controller');

const router = Router();

// El middleware verifica el JWT una vez y añade req.userId. Las rutas nunca
// aceptan user_id desde el cliente, evitando actuar sobre datos de otro usuario.
router.use(authenticate);

// El catálogo se declara explícitamente antes de posibles rutas con parámetros.
router.get('/types', activityController.getActivityTypes);
router.get('/', activityController.getActivities);
router.post('/', activityController.createActivity);
router.patch('/:id', activityController.updateActivity);
router.delete('/:id', activityController.deleteActivity);

module.exports = router;
