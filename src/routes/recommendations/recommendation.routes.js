const { Router } = require('express');

const authenticate = require('../../middlewares/authenticate');
const recommendationController = require('./recommendation.controller');

const router = Router();

// userId procede exclusivamente del JWT; el cliente solo puede elegir la fecha
// que desea analizar y nunca puede consultar los hábitos de otro usuario.
router.use(authenticate);
router.get('/', recommendationController.getRecommendations);

module.exports = router;
