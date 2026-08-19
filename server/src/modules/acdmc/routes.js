const acdmcRoutes = require('../../routes/acdmcRoutes');

const mountRoutes = (router) => {
  router.use('/acdmc', acdmcRoutes);
};

module.exports = { mountRoutes };
