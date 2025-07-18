import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from './database';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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