const sleepRepository = require('../repositories/sleepRepository');
const AppError = require('../utils/AppError');

const UPDATABLE_FIELDS = [
  'started_at',
  'ended_at',
  'sleep_quality',
  'sleep_latency_minutes',
  'awakenings_count',
  'sleep_type',
  'factors',
  'log_date',
];

const hasOwn = (object, property) =>
  Object.prototype.hasOwnProperty.call(object, property);

const validateUuid = (value) => {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new AppError('El identificador del registro de sueño no es válido', 400);
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

// Recibimos fechas ISO 8601 completas, preferiblemente con zona horaria, para
// representar instantes inequívocos y poder comparar la regularidad del sueño.
const validateDateTime = (value, fieldName, required = true) => {
  // Los registros anteriores a la migración 007 no tienen estos instantes.
  if (!required && (value === null || value === undefined)) {
    return null;
  }

  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new AppError(
      `${fieldName} debe ser una fecha ISO 8601 con zona horaria`,
      400
    );
  }

  return value;
};

const calculateDurationMinutes = (startedAt, endedAt) => {
  // Los datos históricos pueden no tener fechas exactas; su duración ya fue
  // conservada por la migración y se permite mantenerla al editar otros campos.
  if (startedAt === null && endedAt === null) {
    return null;
  }

  if (startedAt === null || endedAt === null) {
    throw new AppError('Debes indicar tanto el inicio como el final del sueño', 400);
  }

  const durationMinutes = Math.round(
    (Date.parse(endedAt) - Date.parse(startedAt)) / 60000
  );

  if (durationMinutes <= 0 || durationMinutes > 1440) {
    throw new AppError(
      'El final debe ser posterior al inicio y la duración máxima es de 24 horas',
      400
    );
  }

  return durationMinutes;
};

const validateSleepQuality = (value) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 5) {
    throw new AppError('La calidad del sueño debe estar entre 1 y 5', 400);
  }

  return parsedValue;
};

const validateNonNegativeInteger = (value, fieldName, maximum = null) => {
  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 0 ||
    (maximum !== null && parsedValue > maximum)
  ) {
    const rangeMessage = maximum === null
      ? 'igual o mayor que cero'
      : `entre 0 y ${maximum}`;
    throw new AppError(`${fieldName} debe ser un entero ${rangeMessage}`, 400);
  }

  return parsedValue;
};

const validateSleepType = (value) => {
  if (!['night', 'nap'].includes(value)) {
    throw new AppError('El tipo de sueño debe ser night o nap', 400);
  }

  return value;
};

// El cliente envía códigos del catálogo. Set elimina duplicados antes de crear
// las relaciones de la tabla sleep_log_factors.
const validateFactorCodes = (value) => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value) || value.some((code) => typeof code !== 'string')) {
    throw new AppError('Los factores deben ser una lista de códigos', 400);
  }

  return [...new Set(value.map((code) => code.trim()).filter(Boolean))];
};

const validateSleep = (sleepData, requireTimes = true) => ({
  ...(() => {
    const startedAt = validateDateTime(
      sleepData.started_at,
      'El inicio del sueño',
      requireTimes
    );
    const endedAt = validateDateTime(
      sleepData.ended_at,
      'El final del sueño',
      requireTimes
    );

    return {
      startedAt,
      endedAt,
      durationMinutes: calculateDurationMinutes(startedAt, endedAt),
    };
  })(),
  sleepQuality: validateSleepQuality(sleepData.sleep_quality),
  sleepLatencyMinutes: validateNonNegativeInteger(
    sleepData.sleep_latency_minutes ?? 0,
    'El tiempo para quedarse dormido',
    1440
  ),
  awakeningsCount: validateNonNegativeInteger(
    sleepData.awakenings_count ?? 0,
    'El número de despertares'
  ),
  sleepType: validateSleepType(sleepData.sleep_type ?? 'night'),
  factorCodes: validateFactorCodes(sleepData.factors),
  logDate: validateDate(sleepData.log_date),
});

const resolveFactorIds = async (factorCodes) => {
  const factors = await sleepRepository.findActiveFactorsByCodes(factorCodes);

  if (factors.length !== factorCodes.length) {
    const foundCodes = new Set(factors.map((factor) => factor.code));
    const invalidCodes = factorCodes.filter((code) => !foundCodes.has(code));
    throw new AppError(
      `Factores de sueño no válidos: ${invalidCodes.join(', ')}`,
      400
    );
  }

  return factors.map((factor) => factor.id);
};

const getSleepFactors = () => sleepRepository.findActiveFactors();

const getSleepLogs = (userId, logDate) => {
  const parsedDate = logDate ? validateDate(logDate) : null;
  return sleepRepository.findAllByUserId(userId, parsedDate);
};

const getSleepLog = async (sleepId, userId) => {
  validateUuid(sleepId);
  const sleepLog = await sleepRepository.findByIdAndUserId(sleepId, userId);

  if (!sleepLog) {
    throw new AppError('Registro de sueño no encontrado', 404);
  }

  return sleepLog;
};

const createSleepLog = async (userId, sleepData) => {
  const validatedData = validateSleep(sleepData);
  const factorIds = await resolveFactorIds(validatedData.factorCodes);
  return sleepRepository.create(userId, validatedData, factorIds);
};

const updateSleepLog = async (sleepId, userId, sleepData) => {
  validateUuid(sleepId);

  if (!UPDATABLE_FIELDS.some((field) => hasOwn(sleepData, field))) {
    throw new AppError('No se proporcionaron campos para actualizar', 400);
  }

  const currentLog = await sleepRepository.findByIdAndUserId(sleepId, userId);

  if (!currentLog) {
    throw new AppError('Registro de sueño no encontrado', 404);
  }

  const mergedData = {};

  for (const field of UPDATABLE_FIELDS) {
    if (hasOwn(sleepData, field)) {
      mergedData[field] = sleepData[field];
    } else if (field === 'factors') {
      mergedData.factors = currentLog.factors.map((factor) => factor.code);
    } else {
      mergedData[field] = currentLog[field];
    }
  }

  // En registros anteriores a la migración 007 se permite conservar ambos
  // instantes a null hasta que el usuario los complete desde el formulario.
  const validatedData = validateSleep(mergedData, false);
  if (validatedData.durationMinutes === null) {
    validatedData.durationMinutes = currentLog.duration_minutes;
  }
  const factorIds = await resolveFactorIds(validatedData.factorCodes);
  const updatedLog = await sleepRepository.updateByIdAndUserId(
    sleepId,
    userId,
    validatedData,
    factorIds
  );

  if (!updatedLog) {
    throw new AppError('Registro de sueño no encontrado', 404);
  }

  return updatedLog;
};

const deleteSleepLog = async (sleepId, userId) => {
  validateUuid(sleepId);
  const deletedLog = await sleepRepository.deleteByIdAndUserId(sleepId, userId);

  if (!deletedLog) {
    throw new AppError('Registro de sueño no encontrado', 404);
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
