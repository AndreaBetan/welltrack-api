const goalService = require('../../services/goalService');

const getGoals = async (req, res, next) => {
  try {
    const goals = await goalService.getGoals(req.userId);

    res.json({
      success: true,
      data: goals,
    });
  } catch (error) {
    next(error);
  }
};

const createGoal = async (req, res, next) => {
  try {
    const goal = await goalService.createGoal(
      req.userId,
      req.body
    );

    res.status(201).json({
      success: true,
      data: goal,
    });
  } catch (error) {
    next(error);
  }
};

const updateGoal = async (req, res, next) => {
  try {
    const goal = await goalService.updateGoal(
      req.params.id,
      req.userId,
      req.body
    );

    res.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    next(error);
  }
};

const deleteGoal = async (req, res, next) => {
  try {
    await goalService.deleteGoal(
      req.params.id,
      req.userId
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
};