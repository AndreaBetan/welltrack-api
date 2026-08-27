const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const userRepository = require('../repositories/userRepository');
const emailRepository = require('../repositories/emailRepository');
const emailService = require('./emailService');
const AppError = require('../utils/AppError');
const {
  todayInAppTimeZone,
  validateIsoDate,
} = require('../utils/dateRange');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PASSWORD_BYTES = 72;
const PASSWORD_RESET_MINUTES = 30;

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

// Validación compartida por registro e inicio de sesión. El límite de 72 bytes
// evita que bcrypt trunque silenciosamente contraseñas más largas.
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

  const normalizedEmail = email.trim().toLowerCase();

  if (
    normalizedEmail.length > 255 ||
    !EMAIL_PATTERN.test(normalizedEmail)
  ) {
    throw new AppError('El correo electrónico no tiene un formato válido', 400);
  }

  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    throw new AppError('La contraseña no puede superar 72 bytes', 400);
  }

  return normalizedEmail;
};

const optionalNumber = (value, fieldName, minimum, maximum) => {
  if (value === '' || value === null || value === undefined) return null;

  const parsedValue = Number(value);
  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < minimum ||
    parsedValue > maximum
  ) {
    throw new AppError(
      `${fieldName} debe estar entre ${minimum} y ${maximum}`,
      400
    );
  }

  return parsedValue;
};

const optionalText = (value, fieldName, maximumLength) => {
  if (value === '' || value === null || value === undefined) return null;

  if (typeof value !== 'string' || value.trim().length > maximumLength) {
    throw new AppError(
      `${fieldName} debe ser texto de hasta ${maximumLength} caracteres`,
      400
    );
  }

  return value.trim() || null;
};

const register = async (userData) => {
  const { name, email, password } = userData;

  const normalizedEmail = validateCredentials(email, password);

  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    throw new AppError(
      'El nombre es obligatorio y no puede superar 100 caracteres',
      400
    );
  }

  if (password.length < 8) {
    throw new AppError(
      'La contraseña debe contener al menos 8 caracteres',
      400
    );
  }

  const birthDate = userData.birth_date
    ? validateIsoDate(userData.birth_date, 'La fecha de nacimiento')
    : null;

  if (birthDate && birthDate > todayInAppTimeZone()) {
    throw new AppError('La fecha de nacimiento no puede estar en el futuro', 400);
  }

  const gender = optionalText(userData.gender, 'El género', 30);
  const height = optionalNumber(userData.height, 'La altura', 50, 300);
  const weight = optionalNumber(userData.weight, 'El peso', 20, 500);

  // Nunca se almacena la contraseña original. bcrypt añade salt y aplica un
  // algoritmo deliberadamente costoso para dificultar ataques por fuerza bruta.
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await userRepository.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      gender,
      birthDate,
      height,
      weight,
      weightLogDate: todayInAppTimeZone(),
    });

    // El alta ya está confirmada antes del envío. Un fallo temporal del proveedor
    // de correo se registra, pero no convierte una cuenta válida en error HTTP.
    emailService.sendWelcomeEmail(user).catch((error) => {
      console.error('No se pudo enviar el correo de bienvenida:', error.message);
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

const requestPasswordReset = async ({ email }) => {
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim().toLowerCase())) {
    throw new AppError('El correo electrónico no tiene un formato válido', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await userRepository.findEmailRecipientByEmail(normalizedEmail);

  // La misma respuesta se devuelve exista o no la cuenta, evitando enumeración
  // de usuarios. Solo se crea y envía el token cuando el destinatario existe.
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000);

    await emailRepository.replacePasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    emailService.sendPasswordResetEmail(user, token, PASSWORD_RESET_MINUTES)
      .catch((error) => {
        console.error('No se pudo enviar la recuperación de contraseña:', error.message);
      });
  }

  return {
    message: 'Si existe una cuenta con ese correo, recibirás las instrucciones para restablecer la contraseña',
  };
};

const resetPassword = async ({ token, password }) => {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    throw new AppError('El enlace de recuperación no es válido o ha caducado', 400);
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw new AppError('La contraseña debe contener al menos 8 caracteres', 400);
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    throw new AppError('La contraseña no puede superar 72 bytes', 400);
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const passwordHash = await bcrypt.hash(password, 10);
  const updated = await emailRepository.consumePasswordResetToken({ tokenHash, passwordHash });

  if (!updated) {
    throw new AppError('El enlace de recuperación no es válido o ha caducado', 400);
  }

  return { message: 'La contraseña se ha actualizado correctamente' };
};

const login = async ({ email, password }) => {
  const normalizedEmail = validateCredentials(email, password);

  const user = await userRepository.findAuthByEmail(
    normalizedEmail
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
  requestPasswordReset,
  resetPassword,
};
