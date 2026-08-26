const distributionService = require(
  '../../services/nutritionGoalDistributionService'
);

const getDistribution = async (req, res, next) => {
  try {
    const distribution = await distributionService.getDistribution(
      req.params.goalId,
      req.userId
    );
    res.json({ success: true, data: distribution });
  } catch (error) {
    next(error);
  }
};

const setDistribution = async (req, res, next) => {
  try {
    const distribution = await distributionService.setDistribution(
      req.params.goalId,
      req.userId,
      req.body
    );
    res.json({ success: true, data: distribution });
  } catch (error) {
    next(error);
  }
};

const deleteDistribution = async (req, res, next) => {
  try {
    await distributionService.deleteDistribution(
      req.params.goalId,
      req.userId
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDistribution,
  setDistribution,
  deleteDistribution,
};
