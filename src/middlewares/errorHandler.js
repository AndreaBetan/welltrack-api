// Se ejecuta cuando ninguna ruta anterior coincide con la petición.
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Punto único para dar a todos los errores el mismo formato JSON.
const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    // Los detalles internos se registran en servidor, no se añaden a la API.
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Error interno del servidor',
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
