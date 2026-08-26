const { Router } = require('express');

const authenticate = require('../../middlewares/authenticate');
const statisticsController = require('./statistics.controller');

const router = Router();

router.use(authenticate);
router.get('/summary', statisticsController.getSummary);
router.get('/trends', statisticsController.getTrends);

module.exports = router;
