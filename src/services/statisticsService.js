const statisticsRepository = require('../repositories/statisticsRepository');
const { resolveDateRange } = require('../utils/dateRange');

const getSummary = async (userId, filters) => {
  const period = resolveDateRange(filters);
  const summary = await statisticsRepository.findSummary(
    userId,
    period.from,
    period.to
  );

  return { period, ...summary };
};

const getTrends = async (userId, filters) => {
  const period = resolveDateRange(filters);
  const trends = await statisticsRepository.findTrends(
    userId,
    period.from,
    period.to
  );

  return { period, ...trends };
};

module.exports = { getSummary, getTrends };
