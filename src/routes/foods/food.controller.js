const foodService = require('../../services/foodService');

const searchFoods = async (req, res, next) => {
  try {
    const result = await foodService.searchFoods(req.query.q);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getFoodDetail = async (req, res, next) => {
  try {
    const food = await foodService.getFoodDetail(req.params.id);
    res.json({ success: true, data: food });
  } catch (error) {
    next(error);
  }
};

const getFoodByBarcode = async (req, res, next) => {
  try {
    const food = await foodService.getFoodByBarcode(req.params.barcode);
    res.json({ success: true, data: food });
  } catch (error) {
    next(error);
  }
};

const calculateFoodPortion = async (req, res, next) => {
  try {
    const result = await foodService.calculateFoodPortion(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchFoods,
  getFoodDetail,
  getFoodByBarcode,
  calculateFoodPortion,
};
