// Punto de entrada: carga la configuración y pone la API a escuchar peticiones.
require('dotenv').config();

const app = require('./src/app');
const PORT = process.env.PORT;

const server = app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

// Exportar el servidor facilita cerrarlo desde pruebas automatizadas.
module.exports = server;
