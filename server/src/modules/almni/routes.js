const almniRoutes = require('../../routes/almniRoutes');

const mountRoutes = (router) => {
  router.use('/almni', almniRoutes);
};

module.exports = { mountRoutes };
