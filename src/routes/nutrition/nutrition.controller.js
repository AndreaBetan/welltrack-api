const nutritionService = require('../../services/nutritionService');

const getNutritionLogs = async (req, res, next) => {
  try {
    const logs = await nutritionService.getNutritionLogs(
      req.userId,
      req.query.date
    );

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

const createNutritionLog = async (req, res, next) => {
  try {
    const log = await nutritionService.createNutritionLog(
      req.userId,
      req.body
    );

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

const createNutritionLogFromFood = async (req, res, next) => {
  try {
    const log = await nutritionService.createNutritionLogFromFood(
      req.userId,
      req.body
    );

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

const createNutritionLogFromBarcode = async (req, res, next) => {
  try {
    const log = await nutritionService.createNutritionLogFromBarcode(
      req.userId,
      req.body
    );

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

const recalculateNutritionLogFromFood = async (req, res, next) => {
  try {
    const log = await nutritionService.recalculateNutritionLogFromFood(
      req.params.id,
      req.userId,
      req.body
    );

    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

const recalculateNutritionLogFromBarcode = async (req, res, next) => {
  try {
    const log = await nutritionService.recalculateNutritionLogFromBarcode(
      req.params.id,
      req.userId,
      req.body
    );

    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

const updateNutritionLog = async (req, res, next) => {
  try {
    const log = await nutritionService.updateNutritionLog(
      req.params.id,
      req.userId,
      req.body
    );

    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

const deleteNutritionLog = async (req, res, next) => {
  try {
    await nutritionService.deleteNutritionLog(req.params.id, req.userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNutritionLogs,
  createNutritionLog,
  createNutritionLogFromFood,
  createNutritionLogFromBarcode,
  recalculateNutritionLogFromFood,
  recalculateNutritionLogFromBarcode,
  updateNutritionLog,
  deleteNutritionLog,
};
