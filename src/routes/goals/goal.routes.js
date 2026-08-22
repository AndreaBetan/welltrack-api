const { Router } = require('express');

const authenticate = require('../../middlewares/authenticate');
const goalController = require('./goal.controller');

const router = Router();

// Todas las rutas de metas requieren un JWT válido.
router.use(authenticate);

router.get('/', goalController.getGoals);
router.post('/', goalController.createGoal);
router.patch('/:id', goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);

module.exports = router;