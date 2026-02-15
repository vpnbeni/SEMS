require('dotenv').config();

const app = require('./app');
const { connectDatabase } = require('./config/database');
const { ensureDefaultPlans } = require('./services/onboardingService');

const PORT = Number.parseInt(process.env.PORT || '5100', 10);

async function bootstrap() {
  await connectDatabase();
  await ensureDefaultPlans();

  app.listen(PORT, () => {
    console.log(`[billing-service] running on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('[billing-service] failed to start', error);
  process.exit(1);
});
