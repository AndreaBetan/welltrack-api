const goalRepository = require('../repositories/goalRepository');
const distributionRepository = require(
  '../repositories/nutritionGoalDistributionRepository'
);
const AppError = require('../utils/AppError');

const validateUuid = (value) => {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new AppError('El identificador de la meta no es válido', 400);
  }
};

const parsePercentage = (value, fieldName) => {
  if (value === null || value === undefined || value === '') {
    throw new AppError(`${fieldName} es obligatorio`, 400);
  }

  const percentage = Number(value);
  const percentageInCents = Math.round(percentage * 100);

  if (
    !Number.isFinite(percentage) ||
    percentage <= 0 ||
    percentage > 100 ||
    Math.abs(percentage * 100 - percentageInCents) > 0.000001
  ) {
    throw new AppError(
      `${fieldName} debe ser mayor que cero y tener máximo dos decimales`,
      400
    );
  }

  return percentageInCents;
};

const validateDistribution = (data) => {
  const carbsInCents = parsePercentage(
    data.carbs_percentage,
    'El porcentaje de carbohidratos'
  );
  const proteinInCents = parsePercentage(
    data.protein_percentage,
    'El porcentaje de proteínas'
  );
  const fatInCents = parsePercentage(
    data.fat_percentage,
    'El porcentaje de grasas'
  );

  if (carbsInCents + proteinInCents + fatInCents !== 10000) {
    throw new AppError('Los porcentajes deben sumar exactamente 100', 400);
  }

  return {
    carbsPercentage: carbsInCents / 100,
    proteinPercentage: proteinInCents / 100,
    fatPercentage: fatInCents / 100,
  };
};

const ensureGoalExists = async (goalId, userId) => {
  validateUuid(goalId);
  const goal = await goalRepository.findByIdAndUserId(goalId, userId);

  if (!goal) {
    throw new AppError('Meta no encontrada', 404);
  }
};

const getDistribution = async (goalId, userId) => {
  await ensureGoalExists(goalId, userId);
  const distribution = await distributionRepository.findByGoalIdAndUserId(
    goalId,
    userId
  );

  if (!distribution) {
    throw new AppError('Distribución nutricional no encontrada', 404);
  }

  return distribution;
};

const setDistribution = async (goalId, userId, data) => {
  await ensureGoalExists(goalId, userId);
  const distribution = await distributionRepository.upsertByGoalIdAndUserId(
    goalId,
    userId,
    validateDistribution(data)
  );

  if (!distribution) {
    throw new AppError('Meta no encontrada', 404);
  }

  return distribution;
};

const deleteDistribution = async (goalId, userId) => {
  await ensureGoalExists(goalId, userId);
  const deleted = await distributionRepository.deleteByGoalIdAndUserId(
    goalId,
    userId
  );

  if (!deleted) {
    throw new AppError('Distribución nutricional no encontrada', 404);
  }
};

module.exports = {
  getDistribution,
  setDistribution,
  deleteDistribution,
};
