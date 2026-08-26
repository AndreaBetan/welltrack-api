const { Router } = require('express');

const authenticate = require('../../middlewares/authenticate');
const dashboardController = require('./dashboard.controller');

const router = Router();

router.use(authenticate);
router.get('/', dashboardController.getDashboard);

module.exports = router;
