const AppError = require('../utils/AppError');

const SEARCH_PAGE_SIZE = 20;
const REQUEST_TIMEOUT_MS = 8000;
const DETAIL_CACHE_TTL_MS = 60 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const BARCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SEARCH_CACHE_ENTRIES = 200;
const MAX_DETAIL_CACHE_ENTRIES = 200;
const MAX_BARCODE_CACHE_ENTRIES = 200;
const foodDetailCache = new Map();
const foodSearchCache = new Map();
const barcodeCache = new Map();

const getCalorieApiConfiguration = () => {
  const apiUrl = process.env.CALORIE_API_URL;
  const apiKey = process.env.CALORIE_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error('La configuración de CalorieAPI está incompleta');
  }

  return { apiUrl: apiUrl.replace(/\/$/, ''), apiKey };
};

const normalizeQuery = (query) => {
  if (typeof query !== 'string' || !query.trim()) {
    throw new AppError('El parámetro de búsqueda q es obligatorio', 400);
  }

  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2 || normalizedQuery.length > 100) {
    throw new AppError(
      'El parámetro q debe contener entre 2 y 100 caracteres',
      400
    );
  }

  return normalizedQuery;
};

const validateFoodId = (foodId) => {
  const normalizedId = String(foodId ?? '').trim();

  if (!/^\d+$/.test(normalizedId)) {
    throw new AppError('El identificador del alimento no es válido', 400);
  }

  return normalizedId;
};

const validateBarcode = (barcode) => {
  // El escáner puede devolver espacios o guiones; se eliminan antes de validar.
  const normalizedBarcode = String(barcode ?? '').replace(/[^\d]/g, '');

  if (![8, 12, 13, 14].includes(normalizedBarcode.length)) {
    throw new AppError(
      'El código de barras debe ser un UPC o EAN válido',
      400
    );
  }

  return normalizedBarcode;
};

const validatePositiveNumber = (value, fieldName) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new AppError(`${fieldName} debe ser un número mayor que cero`, 400);
  }

  return parsedValue;
};

// Centraliza la autenticación y traduce los errores del proveedor a errores de
// nuestra API. La clave nunca se envía al navegador.
const requestCalorieApi = async (url, notFoundMessage = null) => {
  const { apiKey } = getCalorieApiConfiguration();

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-API-Key': apiKey,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status === 404 && notFoundMessage) {
      throw new AppError(notFoundMessage, 404);
    }

    if (response.status === 429) {
      throw new AppError(
        'Se ha alcanzado temporalmente el límite de consultas de CalorieAPI',
        503
      );
    }

    if (response.status === 401) {
      throw new AppError('La clave de CalorieAPI no es válida', 502);
    }

    if (response.status === 402) {
      throw new AppError('Se ha agotado la cuota mensual de CalorieAPI', 503);
    }

    if ([403, 423].includes(response.status)) {
      throw new AppError(
        'La cuenta de CalorieAPI no permite realizar esta consulta',
        503
      );
    }

    if (!response.ok) {
      throw new AppError(
        'El servicio externo de alimentos no está disponible',
        502
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error.name === 'TimeoutError') {
      throw new AppError(
        'La consulta a CalorieAPI ha excedido el tiempo límite',
        504
      );
    }

    throw new AppError(
      'No se ha podido conectar con el servicio de alimentos',
      502
    );
  }
};

// Se devuelve un contrato propio de WellTrack. De este modo el frontend no
// depende directamente de los nombres internos utilizados por CalorieAPI.
const mapFood = (food) => ({
  externalFoodId: String(food.id),
  name: food.name,
  brand: food.brand_name || null,
  verified: Boolean(food.is_verified),
  calories: Number(food.calories_100g ?? 0),
  protein: Number(food.protein_100g ?? 0),
  carbs: Number(food.carbs_100g ?? 0),
  fat: Number(food.fat_100g ?? 0),
  fiber: Number(food.fiber_100g ?? 0),
  sugar: Number(food.sugar_100g ?? 0),
  servingSize: Number(food.serving_size ?? 100),
  servingUnit: food.serving_unit || 'g',
  defaultPortion: food.default_portion || null,
  portionsCount: Number(food.portions_count ?? 0),
});

const mapPortion = (portion, index) => ({
  id: `portion-${index + 1}`,
  label: portion.label,
  grams: Number(portion.grams),
  nutritionMultiplier: Number(portion.grams) / 100,
});

const mapFoodDetail = (food) => {
  const verifiedPortions = Array.isArray(food.verified_portions)
    ? food.verified_portions.filter(
      (portion) => Number.isFinite(Number(portion.grams)) && portion.grams > 0
    )
    : [];

  // Aunque no existan porciones domésticas verificadas, siempre se permite
  // introducir el peso real en gramos para no inventar conversiones.
  const portions = verifiedPortions.map(mapPortion);

  return {
    externalFoodId: String(food.id),
    name: food.name,
    brand: food.brand_name || null,
    verified: Boolean(food.is_verified),
    nutritionPer100g: {
      calories: Number(food.calories_100g ?? 0),
      protein: Number(food.protein_100g ?? 0),
      carbs: Number(food.carbs_100g ?? 0),
      fat: Number(food.fat_100g ?? 0),
      fiber: Number(food.fiber_100g ?? 0),
      sugar: Number(food.sugar_100g ?? 0),
    },
    defaultPortion: food.default_portion || null,
    portions,
    customGramsAllowed: true,
  };
};

const nullableNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const mapBarcodeFood = (data) => ({
  barcode: String(data.barcode),
  name: data.product?.name || null,
  brand: data.product?.brand || null,
  category: data.product?.category || null,
  genericName: data.product?.generic_name || null,
  packageQuantity: data.product?.quantity || null,
  ingredients: data.product?.ingredients || null,
  allergens: Array.isArray(data.product?.allergens)
    ? data.product.allergens
    : [],
  serving: data.serving
    ? {
      label: data.serving.label || null,
      quantity: nullableNumber(data.serving.quantity),
      unit: data.serving.unit || null,
    }
    : null,
  nutritionPer100g: {
    calories: nullableNumber(data.nutrition_per_100g?.energy_kcal),
    protein: nullableNumber(data.nutrition_per_100g?.protein_g),
    carbs: nullableNumber(data.nutrition_per_100g?.carbohydrates_g),
    fat: nullableNumber(data.nutrition_per_100g?.fat_g),
    fiber: nullableNumber(data.nutrition_per_100g?.fiber_g),
    sugar: nullableNumber(data.nutrition_per_100g?.sugars_g),
  },
  nutritionPerServing: data.nutrition_per_serving || null,
  customGramsAllowed: true,
});

const searchFoods = async (query) => {
  const normalizedQuery = normalizeQuery(query);
  const cacheKey = normalizedQuery.toLocaleLowerCase('es');
  const cached = foodSearchCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const { apiUrl } = getCalorieApiConfiguration();
  const url = new URL(`${apiUrl}/search/foods`);

  url.searchParams.set('q', normalizedQuery);
  url.searchParams.set('limit', String(SEARCH_PAGE_SIZE));
  url.searchParams.set('skip', '0');

  const data = await requestCalorieApi(url);

  const result = {
    query: normalizedQuery,
    total: Number(data.total ?? 0),
    skip: Number(data.skip ?? 0),
    limit: Number(data.limit ?? SEARCH_PAGE_SIZE),
    foods: Array.isArray(data.data) ? data.data.map(mapFood) : [],
  };

  // Map conserva el orden de inserción; se elimina la entrada más antigua para
  // evitar que la caché crezca indefinidamente.
  if (foodSearchCache.size >= MAX_SEARCH_CACHE_ENTRIES) {
    const oldestKey = foodSearchCache.keys().next().value;
    foodSearchCache.delete(oldestKey);
  }

  foodSearchCache.set(cacheKey, {
    result,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
  });

  return result;
};

const getFoodDetail = async (foodId) => {
  const normalizedId = validateFoodId(foodId);
  const cached = foodDetailCache.get(normalizedId);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.food;
  }

  const { apiUrl } = getCalorieApiConfiguration();
  const data = await requestCalorieApi(
    new URL(`${apiUrl}/foods/${normalizedId}`),
    'Alimento no encontrado'
  );
  // Algunas versiones del proveedor envuelven el resultado en data.
  const food = mapFoodDetail(data.data || data);

  if (foodDetailCache.size >= MAX_DETAIL_CACHE_ENTRIES) {
    const oldestKey = foodDetailCache.keys().next().value;
    foodDetailCache.delete(oldestKey);
  }

  foodDetailCache.set(normalizedId, {
    food,
    expiresAt: Date.now() + DETAIL_CACHE_TTL_MS,
  });

  return food;
};

const getFoodByBarcode = async (barcode) => {
  const normalizedBarcode = validateBarcode(barcode);
  const cached = barcodeCache.get(normalizedBarcode);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.food;
  }

  const { apiUrl } = getCalorieApiConfiguration();
  const data = await requestCalorieApi(
    new URL(`${apiUrl}/search/barcode/${normalizedBarcode}`),
    'No se encontró ningún alimento con ese código de barras'
  );
  const food = mapBarcodeFood(data.data || data);

  if (barcodeCache.size >= MAX_BARCODE_CACHE_ENTRIES) {
    const oldestKey = barcodeCache.keys().next().value;
    barcodeCache.delete(oldestKey);
  }

  barcodeCache.set(normalizedBarcode, {
    food,
    expiresAt: Date.now() + BARCODE_CACHE_TTL_MS,
  });

  return food;
};

const roundNutrition = (value) => Math.round(value * 100) / 100;

const calculateFoodPortion = async (calculationData) => {
  const foodId = validateFoodId(calculationData.food_id);
  const portionGrams = validatePositiveNumber(
    calculationData.portion_grams,
    'El peso de la porción'
  );
  const quantity = validatePositiveNumber(
    calculationData.quantity ?? 1,
    'La cantidad'
  );
  const servingGrams = portionGrams * quantity;

  if (servingGrams > 5000) {
    throw new AppError('La cantidad total no puede superar 5000 gramos', 400);
  }

  const food = await getFoodDetail(foodId);
  const multiplier = servingGrams / 100;
  const nutrition = food.nutritionPer100g;

  return {
    externalFoodId: food.externalFoodId,
    foodName: food.name,
    brand: food.brand,
    verified: food.verified,
    portionGrams,
    quantity,
    servingGrams: roundNutrition(servingGrams),
    nutrition: {
      calories: roundNutrition(nutrition.calories * multiplier),
      protein: roundNutrition(nutrition.protein * multiplier),
      carbs: roundNutrition(nutrition.carbs * multiplier),
      fat: roundNutrition(nutrition.fat * multiplier),
      fiber: roundNutrition(nutrition.fiber * multiplier),
      sugar: roundNutrition(nutrition.sugar * multiplier),
    },
  };
};

const calculateBarcodePortion = async (calculationData) => {
  const food = await getFoodByBarcode(calculationData.barcode);
  const servingGrams = validatePositiveNumber(
    calculationData.serving_grams,
    'La cantidad consumida'
  );

  if (servingGrams > 5000) {
    throw new AppError('La cantidad total no puede superar 5000 gramos', 400);
  }

  const requiredMacros = ['calories', 'protein', 'carbs', 'fat'];
  const missingMacros = requiredMacros.filter(
    (field) => food.nutritionPer100g[field] === null
  );

  if (missingMacros.length > 0) {
    throw new AppError(
      'El producto no contiene información nutricional suficiente para guardarlo',
      422
    );
  }

  const multiplier = servingGrams / 100;
  const scaleNullable = (value) => value === null
    ? null
    : roundNutrition(value * multiplier);

  return {
    barcode: food.barcode,
    foodName: food.name,
    brand: food.brand,
    servingGrams: roundNutrition(servingGrams),
    nutrition: {
      calories: scaleNullable(food.nutritionPer100g.calories),
      protein: scaleNullable(food.nutritionPer100g.protein),
      carbs: scaleNullable(food.nutritionPer100g.carbs),
      fat: scaleNullable(food.nutritionPer100g.fat),
      fiber: scaleNullable(food.nutritionPer100g.fiber),
      sugar: scaleNullable(food.nutritionPer100g.sugar),
    },
  };
};

module.exports = {
  searchFoods,
  getFoodDetail,
  getFoodByBarcode,
  calculateFoodPortion,
  calculateBarcodePortion,
};
