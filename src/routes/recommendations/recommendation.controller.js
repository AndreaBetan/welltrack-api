const recommendationService = require('../../services/recommendationService');

const getRecommendations = async (req, res, next) => {
  try {
    const result = await recommendationService.getRecommendations(
      req.userId,
      req.query.date
    );

    // Todos los endpoints exponen el resultado dentro de `data`. De esta forma,
    // el helper apiRequest() del frontend puede devolver response.data sin
    // descartar los metadatos asociados a las recomendaciones del día.
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendations,
};
