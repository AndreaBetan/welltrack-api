const { Router } = require('express');

const activityRoutes = require('./activities/activity.routes');
const authRoutes = require('./auth/auth.routes');
const dashboardRoutes = require('./dashboard/dashboard.routes');
const foodRoutes = require('./foods/food.routes');
const goalRoutes = require('./goals/goal.routes');
const healthRoutes = require('./health');
const nutritionRoutes = require('./nutrition/nutrition.routes');
const recommendationRoutes = require('./recommendations/recommendation.routes');
const sleepRoutes = require('./sleep/sleep.routes');
const statisticsRoutes = require('./statistics/statistics.routes');
const userRoutes = require('./users/user.routes');

const router = Router();

router.use('/activities', activityRoutes);
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/foods', foodRoutes);
router.use('/goals', goalRoutes);
router.use('/health', healthRoutes);
router.use('/nutrition', nutritionRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/sleep', sleepRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/users', userRoutes);

module.exports = router;
