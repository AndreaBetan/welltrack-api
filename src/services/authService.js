const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');

// Genera un token firmado. El payload queda vacío porque la identidad se
// representa mediante el claim estándar sub (subject).
const createToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está configurado');
  }

  return jwt.sign({}, process.env.JWT_SECRET, {
    subject: String(userId),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256',
    issuer: process.env.JWT_ISSUER || 'welltrack-api',
    audience: process.env.JWT_AUDIENCE || 'welltrack-client',
  });
};

// Validación compartida por registro e inicio de sesión.
const validateCredentials = (email, password) => {
  if (!email || !password) {
    throw new AppError(
      'El correo electrónico y la contraseña son obligatorios',
      400
    );
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new AppError(
      'El correo electrónico y la contraseña deben ser cadenas de texto',
      400
    );
  }
};

const register = async (userData) => {
  const { name, email, password } = userData;

  validateCredentials(email, password);

  if (typeof name !== 'string' || !name.trim()) {
    throw new AppError('El nombre es obligatorio', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  // Nunca se almacena la contraseña original. bcrypt añade salt y aplica un
  // algoritmo deliberadamente costoso para dificultar ataques por fuerza bruta.
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await userRepository.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      gender: userData.gender || null,
      birthDate: userData.birth_date || null,
      height: userData.height || null,
      weight: userData.weight || null,
    });

    return { user, token: createToken(user.id) };
  } catch (error) {
    // PostgreSQL utiliza 23505 para una violación de restricción UNIQUE.
    if (error.code === '23505') {
      throw new AppError(
        'Ya existe una cuenta con este correo electrónico',
        409
      );
    }

    throw error;
  }
};

const login = async ({ email, password }) => {
  validateCredentials(email, password);

  const user = await userRepository.findAuthByEmail(
    email.trim().toLowerCase()
  );

  // bcrypt.compare calcula el hash de forma segura y lo compara con el guardado.
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError('Correo electrónico o contraseña incorrectos', 401);
  }

  // El hash tampoco debe salir en la respuesta aunque no sea la contraseña.
  delete user.password_hash;

  return { user, token: createToken(user.id) };
};

module.exports = {
  register,
  login,
};
