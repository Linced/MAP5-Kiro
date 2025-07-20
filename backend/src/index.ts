import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from './database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Production security configuration
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", isProduction ? "https://trade-insight-frontend.vercel.app" : "http://localhost:3000"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = [
      'http://localhost:3000', // Development frontend (CRA)
      'http://localhost:5173', // Development frontend (Vite)
      'http://127.0.0.1:5173', // Alternative localhost
      'http://127.0.0.1:3000', // Alternative localhost
      'https://trade-insight-frontend.vercel.app', // Production frontend
      process.env.FRONTEND_URL // Environment-specific frontend URL
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));

// Static asset caching middleware
app.use('/static', express.static('public', {
  maxAge: '1y', // Cache static assets for 1 year
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set different cache policies based on file type
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for other files
    }
  }
}));

// API response caching headers
app.use('/api', (req, res, next) => {
  // Set cache headers for API responses
  if (req.method === 'GET') {
    // Cache GET requests for a short time
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.setHeader('ETag', `"${Date.now()}"`);
  } else {
    // Don't cache non-GET requests
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    // Basic health check
    const health: any = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    };

    // Check database connectivity
    try {
      const { database } = require('./database');
      await database.all('SELECT 1');
      health.database = 'connected';
    } catch (error) {
      health.database = 'disconnected';
      health.status = 'DEGRADED';
    }

    // Check email service if configured
    try {
      const { productionEmailService } = require('./services/productionEmailService');
      if (productionEmailService.isReady()) {
        health.email = 'configured';
      } else {
        health.email = 'not_configured';
      }
    } catch (error) {
      health.email = 'error';
    }

    res.status(health.status === 'OK' ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Readiness probe for Kubernetes/container orchestration
app.get('/ready', async (_req, res) => {
  try {
    // Check if all critical services are ready
    const { database } = require('./database');
    await database.all('SELECT 1');
    
    res.json({ 
      status: 'READY', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Performance monitoring endpoint
app.get('/api/performance', (_req, res) => {
  try {
    const { PerformanceMonitor } = require('./utils/performanceMonitor');
    const { MemoryManager } = require('./utils/memoryManager');
    
    const performanceMonitor = PerformanceMonitor.getInstance();
    const memoryManager = MemoryManager.getInstance();
    
    const report = {
      ...performanceMonitor.getPerformanceReport(),
      memoryUsage: memoryManager.getMemoryUsage(),
      processingQueue: memoryManager.getProcessingQueueStatus(),
      timestamp: new Date().toISOString()
    };
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to generate performance report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Import routes
import { authRoutes, uploadRoutes, dataRoutes, calculationRoutes, chartRoutes, strategyRoutes, bucketRoutes, tagRoutes } from './routes';

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/calculations', calculationRoutes);
app.use('/api/charts', chartRoutes);
app.use('/api/strategies', strategyRoutes);
app.use('/api/buckets', bucketRoutes);
app.use('/api/tags', tagRoutes);

// Root route
app.get('/', (_req, res) => {
  res.json({ 
    message: 'TradeInsight API Server',
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api',
      ready: '/ready'
    }
  });
});

// Placeholder for API routes
app.get('/api', (_req, res) => {
  res.json({ message: 'TradeInsight API is running' });
});

// Import enhanced error handling utilities
import { 
  enhancedErrorHandler, 
  notFoundHandler, 
  requestTimeout,
  setupGlobalErrorHandlers,
  errorMetricsMiddleware
} from './middleware/errorHandling';

// Setup global error handlers for unhandled rejections and exceptions
setupGlobalErrorHandlers();

// Request timeout middleware
app.use(requestTimeout(30000)); // 30 second timeout

// 404 handler - must come before global error handler
app.use('*', notFoundHandler);

// Error metrics collection middleware
app.use(errorMetricsMiddleware);

// Enhanced global error handling middleware - must be last
app.use(enhancedErrorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('Database initialized successfully');

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        
        try {
          await closeDatabase();
          console.log('Database connection closed');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;