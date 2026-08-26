const AppError = require('./AppError');

const APP_TIME_ZONE = process.env.APP_TIMEZONE || 'Europe/Madrid';
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const validateIsoDate = (value, fieldName = 'La fecha') => {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
    throw new AppError(`${fieldName} debe tener el formato AAAA-MM-DD`, 400);
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AppError(`${fieldName} no es válida`, 400);
  }

  return value;
};

const todayInAppTimeZone = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const addDays = (dateValue, days) => {
  const date = new Date(`${dateValue}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const differenceInDays = (from, to) =>
  Math.round(
    (new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) /
      86400000
  );

const resolveDateRange = ({ from, to }, defaultDays = 30) => {
  const today = todayInAppTimeZone();
  const resolvedTo = to
    ? validateIsoDate(to, 'La fecha final')
    : today;
  const resolvedFrom = from
    ? validateIsoDate(from, 'La fecha inicial')
    : addDays(resolvedTo, -(defaultDays - 1));

  const rangeDays = differenceInDays(resolvedFrom, resolvedTo) + 1;
  if (resolvedTo > today) {
    throw new AppError('La fecha final no puede estar en el futuro', 400);
  }

  if (rangeDays <= 0) {
    throw new AppError('La fecha inicial no puede ser posterior a la final', 400);
  }

  if (rangeDays > 366) {
    throw new AppError('El periodo consultado no puede superar 366 días', 400);
  }

  return { from: resolvedFrom, to: resolvedTo, days: rangeDays };
};

module.exports = {
  APP_TIME_ZONE,
  addDays,
  resolveDateRange,
  todayInAppTimeZone,
  validateIsoDate,
};
