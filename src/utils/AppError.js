// Error operacional con código HTTP. Permite que servicios y middlewares
// comuniquen fallos esperados sin construir directamente una respuesta Express.
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
