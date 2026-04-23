/**
 * ATTND module route registrar.
 */
const attndRoutes = require('../../routes/attndRoutes');

const mountRoutes = (router) => {
  router.use('/attnd', attndRoutes);
};

module.exports = { mountRoutes };
