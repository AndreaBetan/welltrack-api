const activityService = require('../../services/activityService');

// El controlador adapta las peticiones HTTP a llamadas del servicio. No incluye
// SQL ni reglas de negocio para mantener separadas las responsabilidades.
const getActivityTypes = async (req, res, next) => {
  try {
    const activityTypes = await activityService.getActivityTypes();

    res.json({ success: true, data: activityTypes });
  } catch (error) {
    next(error);
  }
};

const getActivities = async (req, res, next) => {
  try {
    const activities = await activityService.getActivities(
      req.userId,
      req.query.date
    );

    res.json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
};

const createActivity = async (req, res, next) => {
  try {
    const activity = await activityService.createActivity(
      req.userId,
      req.body
    );

    res.status(201).json({ success: true, data: activity });
  } catch (error) {
    next(error);
  }
};

const updateActivity = async (req, res, next) => {
  try {
    const activity = await activityService.updateActivity(
      req.params.id,
      req.userId,
      req.body
    );

    res.json({ success: true, data: activity });
  } catch (error) {
    next(error);
  }
};

const deleteActivity = async (req, res, next) => {
  try {
    await activityService.deleteActivity(req.params.id, req.userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivityTypes,
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
};
