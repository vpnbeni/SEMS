const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const path = require('path');
const os = require('os');

// Import custom middleware
const errorHandler = require('./middleware/errorHandler');
const { requestContextMiddleware } = require('./tenancy/requestContext');
const { platformContextMiddleware, tenantContextMiddleware } = require('./tenancy/tenantContextMiddleware');

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const datesheetRoutes = require('./routes/datesheetRoutes');
const roomRoutes = require('./routes/roomRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');
const exportRoutes = require('./routes/exportRoutes');
const guidelinesRoutes = require('./routes/guidelines');
const answerSheetRoutes = require('./routes/answerSheets');
const centreDatesheetRoutes = require('./routes/centreDatesheet');
const seatingPlanRoutes = require('./routes/seatingPlan');
const form66Routes = require('./routes/form66');
const dashboardRoutes = require('./routes/dashboardRoutes');
const dutiesRoutes = require('./routes/dutiesRoutes');
const undertakingsRoutes = require('./routes/undertakings');
// const calendarRoutes = require('./routes/calendar'); // Temporarily disabled for debugging

// Create Express app
const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS configuration
const getAllowedOrigins = () => {
  const explicitOrigins = (process.env.CLIENT_URLS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.CLIENT_URL) {
    explicitOrigins.push(process.env.CLIENT_URL);
  }

  return new Set(explicitOrigins);
};

const allowedOrigins = getAllowedOrigins();
const rootAppDomain = (process.env.ROOT_APP_DOMAIN || 'sems.vpnbeni.com').toLowerCase();

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }

    if (hostname === rootAppDomain || hostname.endsWith(`.${rootAppDomain}`)) {
      return true;
    }
  } catch (error) {
    return false;
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'x-tenant-slug'],
  exposedHeaders: ['Content-Disposition', 'Content-Type'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const parseBooleanEnv = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const isDevelopment = process.env.NODE_ENV === 'development';
const rateLimitEnabled = parseBooleanEnv(process.env.RATE_LIMIT_ENABLED, !isDevelopment);
const configuredRateLimitWindow = Number.parseInt(process.env.RATE_LIMIT_WINDOW || '', 10);
const configuredRateLimitMax = Number.parseInt(process.env.RATE_LIMIT_MAX || '', 10);

if (rateLimitEnabled) {
  const limiter = rateLimit({
    windowMs: Number.isFinite(configuredRateLimitWindow) && configuredRateLimitWindow > 0
      ? configuredRateLimitWindow
      : 15 * 60 * 1000,
    max: Number.isFinite(configuredRateLimitMax) && configuredRateLimitMax > 0
      ? configuredRateLimitMax
      : 100,
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(requestContextMiddleware);

// File upload middleware
app.use(fileUpload({
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 }, // 10MB
  abortOnLimit: true,
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: os.tmpdir() // Cross-platform temp directory
}));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Enable gzip compression
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Examination Management System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      teachers: '/api/teachers',
      students: '/api/students',
      subjects: '/api/subjects',
      candidates: '/api/candidates',
      datesheets: '/api/datesheets',
      rooms: '/api/rooms',
      dispatch: '/api/dispatch',
      export: '/api/export',
      answersheets: '/api/answersheets',
      duties: '/api/duties',
      undertakings: '/api/undertakings',
      admin: '/api/admin',
      // calendar: '/api/calendar' // Temporarily disabled for debugging
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

// Platform admin routes (central control plane)
app.use('/api/admin', platformContextMiddleware, adminRoutes);

// Tenant-scoped routes
const tenantScopedRouter = express.Router();
tenantScopedRouter.use(tenantContextMiddleware);
tenantScopedRouter.use('/auth', authRoutes);
tenantScopedRouter.use('/teachers', teacherRoutes);
tenantScopedRouter.use('/students', studentRoutes);
tenantScopedRouter.use('/subjects', subjectRoutes);
tenantScopedRouter.use('/candidates', candidateRoutes);
tenantScopedRouter.use('/datesheets', datesheetRoutes);
tenantScopedRouter.use('/rooms', roomRoutes);
tenantScopedRouter.use('/dispatch', dispatchRoutes);
tenantScopedRouter.use('/export', exportRoutes);
tenantScopedRouter.use('/guidelines', guidelinesRoutes);
tenantScopedRouter.use('/answersheets', answerSheetRoutes);
tenantScopedRouter.use('/centre-datesheet', centreDatesheetRoutes);
tenantScopedRouter.use('/seating-plan', seatingPlanRoutes);
tenantScopedRouter.use('/form66', form66Routes);
tenantScopedRouter.use('/dashboard', dashboardRoutes);
tenantScopedRouter.use('/duties', dutiesRoutes);
tenantScopedRouter.use('/undertakings', undertakingsRoutes);
// tenantScopedRouter.use('/calendar', calendarRoutes); // Temporarily disabled for debugging

app.use('/api', tenantScopedRouter);

// Handle 404 routes
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler (must be last middleware)
app.use(errorHandler);

module.exports = app;
