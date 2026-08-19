const actvtRoutes = require('../../routes/actvtRoutes');

const mountRoutes = (router) => {
  router.use('/actvt', actvtRoutes);
};

module.exports = { mountRoutes };
