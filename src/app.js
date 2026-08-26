const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Helmet añade cabeceras defensivas frente a ataques habituales del navegador.
app.use(helmet());

// Las peticiones sin Origin (por ejemplo, Postman o comunicación entre
// servidores) se permiten. Los navegadores solo pueden llamar desde los
// orígenes declarados explícitamente en CORS_ORIGINS.
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const error = new Error('Origen no permitido por CORS');
    error.statusCode = 403;
    return callback(error);
  },
}));

// El límite explícito reduce el impacto de cuerpos JSON anormalmente grandes.
app.use(express.json({ limit: '100kb' }));

// Todas las rutas funcionales de la aplicación comienzan por /api.
app.use('/api', routes);

// Deben registrarse al final: primero se detectan rutas inexistentes y después
// el manejador central convierte cualquier error en una respuesta HTTP.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
