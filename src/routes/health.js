const { Router } = require('express');

const { query } = require('../db');

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    // Una consulta real comprueba tanto la API como la conexión a PostgreSQL.
    const result = await query('SELECT NOW() AS server_time');

    res.json({
      success: true,
      message: 'La API de WellTrack está funcionando',
      database: 'connected',
      serverTime: result.rows[0].server_time,
    });
  } catch (error) {
    // 503 indica que el servicio está temporalmente indisponible.
    error.statusCode = 503;
    error.message = 'Error de conexión con la base de datos';
    next(error);
  }
});

module.exports = router;
