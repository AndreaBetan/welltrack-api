const { Router } = require('express');

const authenticate = require('../../middlewares/authenticate');
const foodRateLimiter = require('../../middlewares/foodRateLimiter');
const foodController = require('./food.controller');

const router = Router();

// Protege la cuota y evita exponer CalorieAPI como un proxy público.
router.use(authenticate);
router.use(foodRateLimiter);

router.get('/search', foodController.searchFoods);
router.get('/barcode/:barcode', foodController.getFoodByBarcode);
router.post('/calculate', foodController.calculateFoodPortion);
router.get('/:id', foodController.getFoodDetail);

module.exports = router;
