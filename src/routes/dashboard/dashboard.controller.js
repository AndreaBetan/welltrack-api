const dashboardService = require('../../services/dashboardService');

const getDashboard = async (req, res, next) => {
  try {
    const result = await dashboardService.getDashboard(
      req.userId,
      req.query.date
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard };
