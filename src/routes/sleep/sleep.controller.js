const sleepService = require('../../services/sleepService');

// Los controladores gestionan req/res y delegan reglas de negocio al servicio.
const getSleepFactors = async (req, res, next) => {
  try {
    const factors = await sleepService.getSleepFactors();
    res.json({ success: true, data: factors });
  } catch (error) {
    next(error);
  }
};

const getSleepLogs = async (req, res, next) => {
  try {
    const sleepLogs = await sleepService.getSleepLogs(
      req.userId,
      req.query.date
    );

    res.json({ success: true, data: sleepLogs });
  } catch (error) {
    next(error);
  }
};

const getSleepLog = async (req, res, next) => {
  try {
    const sleepLog = await sleepService.getSleepLog(req.params.id, req.userId);

    res.json({ success: true, data: sleepLog });
  } catch (error) {
    next(error);
  }
};

const createSleepLog = async (req, res, next) => {
  try {
    const sleepLog = await sleepService.createSleepLog(req.userId, req.body);

    res.status(201).json({ success: true, data: sleepLog });
  } catch (error) {
    next(error);
  }
};

const updateSleepLog = async (req, res, next) => {
  try {
    const sleepLog = await sleepService.updateSleepLog(
      req.params.id,
      req.userId,
      req.body
    );

    res.json({ success: true, data: sleepLog });
  } catch (error) {
    next(error);
  }
};

const deleteSleepLog = async (req, res, next) => {
  try {
    await sleepService.deleteSleepLog(req.params.id, req.userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSleepFactors,
  getSleepLogs,
  getSleepLog,
  createSleepLog,
  updateSleepLog,
  deleteSleepLog,
};
