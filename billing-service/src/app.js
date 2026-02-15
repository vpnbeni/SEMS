const express = require('express');
const morgan = require('morgan');

const internalRoutes = require('./routes/internalRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json({
  limit: '2mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Capabble Ledger billing service is healthy',
    timestamp: new Date().toISOString(),
  });
});

app.use('/webhooks', webhookRoutes);
app.use('/internal', internalRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

app.use(errorHandler);

module.exports = app;
