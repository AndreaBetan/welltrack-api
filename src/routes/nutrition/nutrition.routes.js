const { Router } = require('express');

const authenticate = require('../../middlewares/authenticate');
const foodRateLimiter = require('../../middlewares/foodRateLimiter');
const nutritionController = require('./nutrition.controller');

const router = Router();

router.use(authenticate);

router.get('/', nutritionController.getNutritionLogs);
router.post(
  '/from-food',
  foodRateLimiter,
  nutritionController.createNutritionLogFromFood
);
router.post(
  '/from-barcode',
  foodRateLimiter,
  nutritionController.createNutritionLogFromBarcode
);
router.patch(
  '/from-food/:id',
  foodRateLimiter,
  nutritionController.recalculateNutritionLogFromFood
);
router.patch(
  '/from-barcode/:id',
  foodRateLimiter,
  nutritionController.recalculateNutritionLogFromBarcode
);
router.post('/', nutritionController.createNutritionLog);
router.patch('/:id', nutritionController.updateNutritionLog);
router.delete('/:id', nutritionController.deleteNutritionLog);

module.exports = router;
