const statisticsService = require('../../services/statisticsService');

const getSummary = async (req, res, next) => {
  try {
    const result = await statisticsService.getSummary(req.userId, req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getTrends = async (req, res, next) => {
  try {
    const result = await statisticsService.getTrends(req.userId, req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSummary, getTrends };
