const express = require('express');
const cors = require('cors');

const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// Middlewares globales: CORS permite llamadas desde otros orígenes y
// express.json transforma el cuerpo JSON en req.body.
app.use(cors());
app.use(express.json());

// Todas las rutas funcionales de la aplicación comienzan por /api.
app.use('/api', routes);

// Deben registrarse al final: primero se detectan rutas inexistentes y después
// el manejador central convierte cualquier error en una respuesta HTTP.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
