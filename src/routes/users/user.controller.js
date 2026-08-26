const userService = require('../../services/userService');

const getMe = async (req, res, next) => {
  try {
    // authenticate.js añadió userId después de verificar el JWT.
    const user = await userService.getCurrentUser(req.userId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const user = await userService.updateCurrentUser(req.userId, req.body);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMe,
  updateMe,
};
