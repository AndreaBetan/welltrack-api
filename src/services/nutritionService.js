const nutritionRepository = require('../repositories/nutritionRepository');
const foodService = require('./foodService');
const AppError = require('../utils/AppError');

const ALLOWED_DATA_SOURCES = new Set(['manual', 'calorieapi']);
const CALORIE_API_PROTECTED_FIELDS = new Set([
  'calories',
  'protein',
  'carbs',
  'fat',
  'data_source',
  'external_food_id',
  'food_name',
  'brand',
  'serving_grams',
]);
const IMMUTABLE_SOURCE_FIELDS = new Set([
  'data_source',
  'external_food_id',
]);

const UPDATABLE_FIELDS = [
  'meal_type',
  'description',
  'calories',
  'protein',
  'carbs',
  'fat',
  'log_date',
  'data_source',
  'external_food_id',
  'food_name',
  'brand',
  'serving_grams',
];

const hasOwn = (object, property) =>
  Object.prototype.hasOwnProperty.call(object, property);

const validateUuid = (value) => {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new AppError('El identificador del registro no es válido', 400);
  }
};

const validateDate = (value, fieldName = 'La fecha') => {
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

  return value;
};

const parseNonNegativeNumber = (value, fieldName) => {
  if (value === null || value === undefined || value === '') {
    throw new AppError(`${fieldName} es obligatorio`, 400);
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new AppError(`${fieldName} debe ser un número igual o mayor que cero`, 400);
  }

  return parsedValue;
};

const parsePositiveNumber = (value, fieldName) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new AppError(`${fieldName} debe ser un número mayor que cero`, 400);
  }

  return parsedValue;
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

const requiredText = (value, fieldName, maxLength) => {
  const parsedValue = optionalText(value, fieldName, maxLength);

  if (!parsedValue) {
    throw new AppError(`${fieldName} es obligatorio`, 400);
  }

  return parsedValue;
};

const validateDataSource = (value) => {
  if (typeof value !== 'string' || !ALLOWED_DATA_SOURCES.has(value)) {
    throw new AppError(
      'La fuente de datos debe ser manual o calorieapi',
      400
    );
  }

  return value;
};

const validateNutrition = (nutritionData) => ({
  mealType: requiredText(nutritionData.meal_type, 'El tipo de comida', 50),
  description: optionalText(nutritionData.description, 'La descripción', 2000),
  calories: parseNonNegativeNumber(nutritionData.calories, 'Las calorías'),
  protein: parseNonNegativeNumber(nutritionData.protein, 'Las proteínas'),
  carbs: parseNonNegativeNumber(nutritionData.carbs, 'Los carbohidratos'),
  fat: parseNonNegativeNumber(nutritionData.fat, 'Las grasas'),
  logDate: validateDate(nutritionData.log_date),
  dataSource: validateDataSource(nutritionData.data_source ?? 'manual'),
  externalFoodId: optionalText(
    nutritionData.external_food_id,
    'El identificador externo',
    100
  ),
  foodName: requiredText(nutritionData.food_name, 'El nombre del alimento', 200),
  brand: optionalText(nutritionData.brand, 'La marca', 150),
  servingGrams: parsePositiveNumber(
    nutritionData.serving_grams,
    'La cantidad de la ración'
  ),
});

const getNutritionLogs = (userId, logDate) => {
  const parsedDate = logDate ? validateDate(logDate) : null;
  return nutritionRepository.findAllByUserId(userId, parsedDate);
};

const createNutritionLog = (userId, nutritionData) => {
  if (
    hasOwn(nutritionData, 'data_source') &&
    nutritionData.data_source !== 'manual'
  ) {
    throw new AppError(
      'El endpoint nutricional genérico solo permite registros manuales',
      400
    );
  }

  // La fuente y el identificador externo se fijan en el servidor. Los datos de
  // CalorieAPI solo pueden entrar por sus endpoints especializados.
  return nutritionRepository.create(userId, validateNutrition({
    ...nutritionData,
    data_source: 'manual',
    external_food_id: null,
  }));
};

// Calcula y guarda en una sola operación del backend. El cliente no decide los
// macronutrientes, evitando manipulaciones o errores de redondeo diferentes.
const createNutritionLogFromFood = async (userId, nutritionData) => {
  // Se validan primero los datos locales para no consumir cuota externa cuando
  // la petición ya es inválida por motivos propios de WellTrack.
  const mealType = requiredText(
    nutritionData.meal_type,
    'El tipo de comida',
    50
  );
  const description = optionalText(
    nutritionData.description,
    'La descripción',
    2000
  );
  const logDate = validateDate(nutritionData.log_date);
  const calculation = await foodService.calculateFoodPortion({
    food_id: nutritionData.food_id,
    portion_grams: nutritionData.portion_grams,
    quantity: nutritionData.quantity,
  });

  return nutritionRepository.create(userId, validateNutrition({
    meal_type: mealType,
    description,
    calories: calculation.nutrition.calories,
    protein: calculation.nutrition.protein,
    carbs: calculation.nutrition.carbs,
    fat: calculation.nutrition.fat,
    log_date: logDate,
    data_source: 'calorieapi',
    external_food_id: calculation.externalFoodId,
    food_name: calculation.foodName,
    brand: calculation.brand,
    serving_grams: calculation.servingGrams,
  }));
};

const createNutritionLogFromBarcode = async (userId, nutritionData) => {
  const mealType = requiredText(
    nutritionData.meal_type,
    'El tipo de comida',
    50
  );
  const description = optionalText(
    nutritionData.description,
    'La descripción',
    2000
  );
  const logDate = validateDate(nutritionData.log_date);
  const calculation = await foodService.calculateBarcodePortion({
    barcode: nutritionData.barcode,
    serving_grams: nutritionData.serving_grams,
  });

  return nutritionRepository.create(userId, validateNutrition({
    meal_type: mealType,
    description,
    calories: calculation.nutrition.calories,
    protein: calculation.nutrition.protein,
    carbs: calculation.nutrition.carbs,
    fat: calculation.nutrition.fat,
    log_date: logDate,
    data_source: 'calorieapi',
    external_food_id: calculation.barcode,
    food_name: calculation.foodName,
    brand: calculation.brand,
    serving_grams: calculation.servingGrams,
  }));
};

const getCalorieApiLog = async (nutritionId, userId) => {
  validateUuid(nutritionId);
  const currentLog = await nutritionRepository.findByIdAndUserId(
    nutritionId,
    userId
  );

  if (!currentLog) {
    throw new AppError('Registro nutricional no encontrado', 404);
  }

  if (currentLog.data_source !== 'calorieapi' || !currentLog.external_food_id) {
    throw new AppError(
      'Este registro no fue creado mediante CalorieAPI',
      409
    );
  }

  return currentLog;
};

const saveRecalculatedLog = async (
  nutritionId,
  userId,
  currentLog,
  calculation
) => {
  const updatedLog = await nutritionRepository.updateByIdAndUserId(
    nutritionId,
    userId,
    validateNutrition({
      ...currentLog,
      calories: calculation.nutrition.calories,
      protein: calculation.nutrition.protein,
      carbs: calculation.nutrition.carbs,
      fat: calculation.nutrition.fat,
      serving_grams: calculation.servingGrams,
      data_source: 'calorieapi',
    })
  );

  if (!updatedLog) {
    throw new AppError('Registro nutricional no encontrado', 404);
  }

  return updatedLog;
};

// Para modificar la cantidad se vuelve a consultar el alimento original y se
// recalculan los macros; nunca se aceptan estos valores desde el cliente.
const recalculateNutritionLogFromFood = async (
  nutritionId,
  userId,
  nutritionData
) => {
  const currentLog = await getCalorieApiLog(nutritionId, userId);
  const calculation = await foodService.calculateFoodPortion({
    food_id: currentLog.external_food_id,
    portion_grams: nutritionData.portion_grams,
    quantity: nutritionData.quantity,
  });

  return saveRecalculatedLog(
    nutritionId,
    userId,
    currentLog,
    calculation
  );
};

const recalculateNutritionLogFromBarcode = async (
  nutritionId,
  userId,
  nutritionData
) => {
  const currentLog = await getCalorieApiLog(nutritionId, userId);
  const calculation = await foodService.calculateBarcodePortion({
    barcode: currentLog.external_food_id,
    serving_grams: nutritionData.serving_grams,
  });

  return saveRecalculatedLog(
    nutritionId,
    userId,
    currentLog,
    calculation
  );
};

const updateNutritionLog = async (nutritionId, userId, nutritionData) => {
  validateUuid(nutritionId);

  const providedFields = UPDATABLE_FIELDS.filter((field) =>
    hasOwn(nutritionData, field)
  );

  if (providedFields.length === 0) {
    throw new AppError('No se proporcionaron campos para actualizar', 400);
  }

  const currentLog = await nutritionRepository.findByIdAndUserId(
    nutritionId,
    userId
  );

  if (!currentLog) {
    throw new AppError('Registro nutricional no encontrado', 404);
  }

  const immutableFields = providedFields.filter((field) =>
    IMMUTABLE_SOURCE_FIELDS.has(field)
  );

  if (immutableFields.length > 0) {
    throw new AppError(
      'La fuente y el identificador externo del registro no se pueden modificar',
      409
    );
  }

  if (currentLog.data_source === 'calorieapi') {
    const protectedFields = providedFields.filter((field) =>
      CALORIE_API_PROTECTED_FIELDS.has(field)
    );

    if (protectedFields.length > 0) {
      throw new AppError(
        'Los datos nutricionales de CalorieAPI deben modificarse recalculando la cantidad',
        409
      );
    }
  }

  const mergedData = {};

  for (const field of UPDATABLE_FIELDS) {
    mergedData[field] = hasOwn(nutritionData, field)
      ? nutritionData[field]
      : currentLog[field];
  }

  const updatedLog = await nutritionRepository.updateByIdAndUserId(
    nutritionId,
    userId,
    validateNutrition(mergedData)
  );

  if (!updatedLog) {
    throw new AppError('Registro nutricional no encontrado', 404);
  }

  return updatedLog;
};

const deleteNutritionLog = async (nutritionId, userId) => {
  validateUuid(nutritionId);

  const deletedLog = await nutritionRepository.deleteByIdAndUserId(
    nutritionId,
    userId
  );

  if (!deletedLog) {
    throw new AppError('Registro nutricional no encontrado', 404);
  }
};

module.exports = {
  getNutritionLogs,
  createNutritionLog,
  createNutritionLogFromFood,
  createNutritionLogFromBarcode,
  recalculateNutritionLogFromFood,
  recalculateNutritionLogFromBarcode,
  updateNutritionLog,
  deleteNutritionLog,
};
