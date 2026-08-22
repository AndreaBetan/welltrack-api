const goalRepository = require('../repositories/goalRepository');
const AppError = require('../utils/AppError');

const VALID_STATUSES = ['active', 'completed', 'cancelled'];
const UPDATABLE_FIELDS = [
  'goal_type',
  'target_value',
  'start_date',
  'end_date',
  'status',
];

const hasOwn = (object, property) =>
  Object.prototype.hasOwnProperty.call(object, property);

const parseDate = (value, fieldName) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(`${fieldName} debe tener el formato AAAA-MM-DD`, 400);
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new AppError(`${fieldName} no es válida`, 400);
  }

  return date;
};

const validateGoal = (goalData) => {
  const {
    goal_type,
    target_value,
    start_date,
    end_date,
    status = 'active',
  } = goalData;

  if (typeof goal_type !== 'string' || !goal_type.trim()) {
    throw new AppError('El tipo de meta es obligatorio', 400);
  }

  const parsedTargetValue = Number(target_value);

  if (!Number.isFinite(parsedTargetValue) || parsedTargetValue <= 0) {
    throw new AppError('El valor objetivo debe ser mayor que cero', 400);
  }

  const parsedStartDate = parseDate(start_date, 'La fecha de inicio');
  const parsedEndDate = parseDate(end_date, 'La fecha de finalización');

  if (parsedEndDate < parsedStartDate) {
    throw new AppError(
      'La fecha de finalización no puede ser anterior a la fecha de inicio',
      400
    );
  }

  if (!VALID_STATUSES.includes(status)) {
    throw new AppError(
      'El estado debe ser active, completed o cancelled',
      400
    );
  }

  return {
    goalType: goal_type.trim(),
    targetValue: parsedTargetValue,
    startDate: start_date,
    endDate: end_date,
    status,
  };
};

const getGoals = (userId) => goalRepository.findAllByUserId(userId);

const createGoal = (userId, goalData) =>
  goalRepository.create(userId, validateGoal(goalData));

const updateGoal = async (goalId, userId, goalData) => {
  const providedFields = UPDATABLE_FIELDS.filter((field) =>
    hasOwn(goalData, field)
  );

  if (providedFields.length === 0) {
    throw new AppError('No se proporcionaron campos para actualizar', 400);
  }

  const currentGoal = await goalRepository.findByIdAndUserId(goalId, userId);

  if (!currentGoal) {
    throw new AppError('Meta no encontrada', 404);
  }

  // PATCH conserva los valores actuales de los campos no enviados.
  const updatedData = validateGoal({
    goal_type: hasOwn(goalData, 'goal_type')
      ? goalData.goal_type
      : currentGoal.goal_type,
    target_value: hasOwn(goalData, 'target_value')
      ? goalData.target_value
      : currentGoal.target_value,
    start_date: hasOwn(goalData, 'start_date')
      ? goalData.start_date
      : currentGoal.start_date,
    end_date: hasOwn(goalData, 'end_date')
      ? goalData.end_date
      : currentGoal.end_date,
    status: hasOwn(goalData, 'status')
      ? goalData.status
      : currentGoal.status,
  });

  const goal = await goalRepository.updateByIdAndUserId(
    goalId,
    userId,
    updatedData
  );

  if (!goal) {
    throw new AppError('Meta no encontrada', 404);
  }

  return goal;
};

const deleteGoal = async (goalId, userId) => {
  const deletedGoal = await goalRepository.softDeleteByIdAndUserId(
    goalId,
    userId
  );

  if (!deletedGoal) {
    throw new AppError('Meta no encontrada', 404);
  }
};

module.exports = {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
};
