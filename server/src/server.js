const dotenv = require('dotenv');
const colors = require('colors');
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);
// Load environment variables
dotenv.config();

// Import database connection
const { connectPlatformDB, getCentralDbName } = require('./config/platformDatabase');
const { runTenantModelStartupSanityCheck } = require('./tenancy/startupTenantModelSanityCheck');

// Import app
const app = require('./app');

// Vercel serverless: export the Express app and run DB init in background (no listen)
if (process.env.VERCEL) {
  const init = async () => {
    try {
      await connectPlatformDB();
      console.log(`✅ Platform database '${getCentralDbName()}' connected (Vercel)`.green.bold);
      await runTenantModelStartupSanityCheck();
    } catch (error) {
      console.error('❌ Server initialization failed (Vercel):'.red.bold, error.message);
    }
  };
  init();
  module.exports = app;
  return;
}

// Import calendar seeder (temporarily disabled for debugging)
// const { initializeCurrentYearCalendar } = require('./utils/calendarSeeder');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...'.red.bold);
  console.log(err.name, err.message);
  process.exit(1);
});

// Connect to platform database (tenant databases are initialized per request)
const initializeServer = async () => {
  try {
    await connectPlatformDB();
    console.log(`✅ Platform database '${getCentralDbName()}' connected successfully`.green.bold);
    await runTenantModelStartupSanityCheck();
    
    // TODO: Re-enable calendar initialization after debugging
    // setTimeout(async () => {
    //   try {
    //     await initializeCurrentYearCalendar();
    //     console.log('✅ Calendar initialized successfully'.green.bold);
    //   } catch (calendarError) {
    //     console.warn('⚠️  Calendar initialization failed (server will continue):'.yellow.bold, calendarError.message);
    //   }
    // }, 2000);
    
    console.log('✅ Server initialization completed successfully'.green.bold);
  } catch (error) {
    console.error('❌ Server initialization failed:'.red.bold, error.message);
    process.exit(1);
  }
};

// Initialize server
initializeServer();

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  );
  console.log(`API URL: http://localhost:${PORT}/api`.cyan.underline);
  console.log(`Health Check: http://localhost:${PORT}/health`.green.underline);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...'.red.bold);
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n👋 SIGINT RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
    process.exit(0);
  });
});

module.exports = server;
