const { Router } = require('express');

const authenticate = require('../../middlewares/authenticate');
const sleepController = require('./sleep.controller');

const router = Router();

// authenticate valida el JWT y coloca el identificador del usuario en req.userId.
router.use(authenticate);

// Debe declararse antes de /:id para que "factors" no se interprete como UUID.
router.get('/factors', sleepController.getSleepFactors);
router.get('/', sleepController.getSleepLogs);
router.get('/:id', sleepController.getSleepLog);
router.post('/', sleepController.createSleepLog);
router.patch('/:id', sleepController.updateSleepLog);
router.delete('/:id', sleepController.deleteSleepLog);

module.exports = router;
