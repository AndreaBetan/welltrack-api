const activityRepository = require('../repositories/activityRepository');
const AppError = require('../utils/AppError');

// Lista blanca de propiedades que PATCH permite modificar.
const UPDATABLE_FIELDS = [
  'activity_type',
  'duration_minutes',
  'calories_burned',
  'log_date',
  'intensity',
  'notes',
];

const hasOwn = (object, property) =>
  Object.prototype.hasOwnProperty.call(object, property);

const validateUuid = (value) => {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new AppError('El identificador de la actividad no es válido', 400);
  }
};

const validateDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError('La fecha debe tener el formato AAAA-MM-DD', 400);
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new AppError('La fecha no es válida', 400);
  }

  return value;
};

const requiredText = (value, fieldName, maxLength) => {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().length > maxLength
  ) {
    throw new AppError(
      `${fieldName} es obligatorio y admite hasta ${maxLength} caracteres`,
      400
    );
  }

  return value.trim();
};

const optionalText = (value, fieldName, maxLength) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new AppError(
      `${fieldName} debe ser texto de hasta ${maxLength} caracteres`,
      400
    );
  }

  return value.trim();
};

const positiveInteger = (value, fieldName) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new AppError(`${fieldName} debe ser un entero mayor que cero`, 400);
  }

  return parsedValue;
};

const optionalNonNegativeInteger = (value, fieldName) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new AppError(`${fieldName} debe ser un entero igual o mayor que cero`, 400);
  }

  return parsedValue;
};

// Convierte el contrato HTTP en el formato interno que espera el repositorio y
// aplica las reglas de negocio antes de ejecutar cualquier consulta SQL.
const validateActivity = (activityData) => ({
  activityType: requiredText(
    activityData.activity_type,
    'El tipo de actividad',
    100
  ),
  durationMinutes: positiveInteger(
    activityData.duration_minutes,
    'La duración'
  ),
  caloriesBurned: optionalNonNegativeInteger(
    activityData.calories_burned,
    'Las calorías quemadas'
  ),
  logDate: validateDate(activityData.log_date),
  intensity: optionalText(activityData.intensity, 'La intensidad', 20),
  notes: optionalText(activityData.notes, 'Las notas', 300),
});

// El catálogo no contiene reglas de negocio adicionales: el servicio mantiene
// el punto de entrada para que el controlador no acceda directamente a SQL.
const getActivityTypes = () => activityRepository.findActiveTypes();

const getActivities = (userId, logDate) => {
  const parsedDate = logDate ? validateDate(logDate) : null;
  return activityRepository.findAllByUserId(userId, parsedDate);
};

const createActivity = (userId, activityData) =>
  activityRepository.create(userId, validateActivity(activityData));

const updateActivity = async (activityId, userId, activityData) => {
  validateUuid(activityId);

  const providedFields = UPDATABLE_FIELDS.filter((field) =>
    hasOwn(activityData, field)
  );

  if (providedFields.length === 0) {
    throw new AppError('No se proporcionaron campos para actualizar', 400);
  }

  const currentActivity = await activityRepository.findByIdAndUserId(
    activityId,
    userId
  );

  if (!currentActivity) {
    throw new AppError('Actividad no encontrada', 404);
  }

  // PATCH conserva los valores actuales de las propiedades que no se enviaron.
  const mergedData = {};

  for (const field of UPDATABLE_FIELDS) {
    mergedData[field] = hasOwn(activityData, field)
      ? activityData[field]
      : currentActivity[field];
  }

  const updatedActivity = await activityRepository.updateByIdAndUserId(
    activityId,
    userId,
    validateActivity(mergedData)
  );

  if (!updatedActivity) {
    throw new AppError('Actividad no encontrada', 404);
  }

  return updatedActivity;
};

const deleteActivity = async (activityId, userId) => {
  validateUuid(activityId);

  const deletedActivity = await activityRepository.deleteByIdAndUserId(
    activityId,
    userId
  );

  if (!deletedActivity) {
    throw new AppError('Actividad no encontrada', 404);
  }
};

module.exports = {
  getActivityTypes,
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
};
