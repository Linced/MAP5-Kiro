import fs from 'fs';
import path from 'path';

// Log levels
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

// Log entry interface
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  stack?: string;
  userId?: number;
  requestId?: string;
}

// Logger configuration
interface LoggerConfig {
  logLevel: LogLevel;
  logToFile: boolean;
  logDirectory: string;
  maxFileSize: number; // in bytes
  maxFiles: number;
  enableConsole: boolean;
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  logLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  logToFile: process.env.NODE_ENV === 'production',
  logDirectory: path.join(process.cwd(), 'logs'),
  maxFileSize: 25 * 1024 * 1024, // 25MB
  maxFiles: 5,
  enableConsole: true
};

export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private currentLogFile?: string;

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.logToFile) {
      this.ensureLogDirectory();
      this.initializeLogFile();
    }
  }

  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.logDirectory)) {
      fs.mkdirSync(this.config.logDirectory, { recursive: true });
    }
  }

  private initializeLogFile(): void {
    const timestamp = new Date().toISOString().split('T')[0];
    this.currentLogFile = path.join(this.config.logDirectory, `app-${timestamp}.log`);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex <= currentLevelIndex;
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, context, stack, userId, requestId } = entry;
    
    let logLine = `[${timestamp}] ${level}: ${message}`;
    
    if (userId) {
      logLine += ` | UserId: ${userId}`;
    }
    
    if (requestId) {
      logLine += ` | RequestId: ${requestId}`;
    }
    
    if (context) {
      logLine += ` | Context: ${JSON.stringify(context)}`;
    }
    
    if (stack) {
      logLine += `\nStack: ${stack}`;
    }
    
    return logLine;
  }

  private writeToFile(logEntry: string): void {
    if (!this.config.logToFile || !this.currentLogFile) {
      return;
    }

    try {
      // Check file size and rotate if necessary
      if (fs.existsSync(this.currentLogFile)) {
        const stats = fs.statSync(this.currentLogFile);
        if (stats.size > this.config.maxFileSize) {
          this.rotateLogFile();
        }
      }

      fs.appendFileSync(this.currentLogFile, logEntry + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private rotateLogFile(): void {
    if (!this.currentLogFile) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = this.currentLogFile.replace('.log', `-${timestamp}.log`);
      
      fs.renameSync(this.currentLogFile, rotatedFile);
      
      // Clean up old log files
      this.cleanupOldLogs();
      
      // Initialize new log file
      this.initializeLogFile();
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  private cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.config.logDirectory)
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.config.logDirectory, file),
          mtime: fs.statSync(path.join(this.config.logDirectory, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Keep only the most recent files
      const filesToDelete = files.slice(this.config.maxFiles);
      
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
      });
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  private log(level: LogLevel, message: string, context?: any, userId?: number, requestId?: string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      ...(userId && { userId }),
      ...(requestId && { requestId })
    };

    const formattedEntry = this.formatLogEntry(entry);

    // Console output
    if (this.config.enableConsole) {
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedEntry);
          break;
        case LogLevel.WARN:
          console.warn(formattedEntry);
          break;
        case LogLevel.INFO:
          console.info(formattedEntry);
          break;
        case LogLevel.DEBUG:
          console.debug(formattedEntry);
          break;
      }
    }

    // File output
    this.writeToFile(formattedEntry);
  }

  error(message: string, error?: Error, context?: any, userId?: number, requestId?: string): void {
    const logContext = {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    this.log(LogLevel.ERROR, message, logContext, userId, requestId);
  }

  warn(message: string, context?: any, userId?: number, requestId?: string): void {
    this.log(LogLevel.WARN, message, context, userId, requestId);
  }

  info(message: string, context?: any, userId?: number, requestId?: string): void {
    this.log(LogLevel.INFO, message, context, userId, requestId);
  }

  debug(message: string, context?: any, userId?: number, requestId?: string): void {
    this.log(LogLevel.DEBUG, message, context, userId, requestId);
  }

  // Request logging middleware
  requestLogger() {
    return (req: any, res: any, next: any) => {
      const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const userId = req.user?.id;
      
      req.requestId = requestId;
      
      const startTime = Date.now();
      
      this.info(`${req.method} ${req.url}`, {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }, userId, requestId);

      // Log response
      const originalSend = res.send;
      res.send = function(data: any) {
        const duration = Date.now() - startTime;
        
        Logger.getInstance().info(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`, {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          responseSize: data ? Buffer.byteLength(data) : 0
        }, userId, requestId);
        
        return originalSend.call(this, data);
      };

      next();
    };
  }

  // Performance monitoring
  performance(operation: string, duration: number, context?: any, userId?: number, requestId?: string): void {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `Performance: ${operation} took ${duration}ms`, context, userId, requestId);
  }

  // Security events
  security(event: string, context?: any, userId?: number, requestId?: string): void {
    this.log(LogLevel.WARN, `Security: ${event}`, context, userId, requestId);
  }

  // Business events
  business(event: string, context?: any, userId?: number, requestId?: string): void {
    this.log(LogLevel.INFO, `Business: ${event}`, context, userId, requestId);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export types
export type { LoggerConfig, LogEntry };