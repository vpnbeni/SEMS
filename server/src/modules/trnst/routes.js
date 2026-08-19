const trnstRoutes = require('../../routes/trnstRoutes');

const mountRoutes = (router) => {
  router.use('/trnst', trnstRoutes);
};

module.exports = { mountRoutes };
