const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');
const { todayInAppTimeZone } = require('../utils/dateRange');

const getCurrentUser = async (userId) => {
  const user = await userRepository.findPublicById(userId);

  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  return user;
};

const updateCurrentUser = async (userId, userData) => {
  const { name, gender, birth_date, height, weight } = userData;

  if (typeof name !== 'string' || !name.trim()) {
    throw new AppError('El nombre es obligatorio', 400);
  }

  // Los formularios suelen enviar números como texto. Se convierten y validan
  // antes de permitir que lleguen a la capa de persistencia.
  const parsedHeight =
    height === '' || height === null || height === undefined
      ? null
      : Number(height);
  const parsedWeight =
    weight === '' || weight === null || weight === undefined
      ? null
      : Number(weight);

  if (
    parsedHeight !== null &&
    (!Number.isFinite(parsedHeight) || parsedHeight < 50 || parsedHeight > 300)
  ) {
    throw new AppError('La altura debe estar entre 50 y 300 cm', 400);
  }

  if (
    parsedWeight !== null &&
    (!Number.isFinite(parsedWeight) || parsedWeight < 20 || parsedWeight > 500)
  ) {
    throw new AppError('El peso debe estar entre 20 y 500 kg', 400);
  }

  const user = await userRepository.updateById(userId, {
    name: name.trim(),
    gender: gender || null,
    birthDate: birth_date || null,
    height: parsedHeight,
    weight: parsedWeight,
    weightLogDate: todayInAppTimeZone(),
  });

  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  return user;
};

module.exports = {
  getCurrentUser,
  updateCurrentUser,
};
