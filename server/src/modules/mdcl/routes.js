const mdclRoutes = require('../../routes/mdclRoutes');

const mountRoutes = (router) => {
  router.use('/mdcl', mdclRoutes);
};

module.exports = { mountRoutes };
