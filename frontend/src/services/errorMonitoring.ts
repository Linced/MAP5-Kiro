// Error monitoring and analytics service
import { ErrorReporter, AppError, ErrorSeverity, collectErrorContext } from '../utils/errors';

// Error analytics interface
interface ErrorAnalytics {
  errorCount: number;
  errorsByType: Record<string, number>;
  errorsByComponent: Record<string, number>;
  recentErrors: Array<{
    timestamp: Date;
    message: string;
    code: string;
    severity: ErrorSeverity;
    context?: any;
  }>;
  networkErrors: number;
  componentErrors: number;
  apiErrors: number;
}

// Performance metrics interface
interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTimes: Record<string, number[]>;
  componentRenderTimes: Record<string, number[]>;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

// User session context
interface SessionContext {
  sessionId: string;
  userId?: number;
  userAgent: string;
  startTime: Date;
  pageViews: string[];
  actions: Array<{
    type: string;
    timestamp: Date;
    details?: any;
  }>;
}

export class ErrorMonitoringService {
  private static instance: ErrorMonitoringService;
  private analytics: ErrorAnalytics;
  private performance: PerformanceMetrics;
  private session: SessionContext;
  private errorReporter: ErrorReporter;

  private constructor() {
    this.errorReporter = ErrorReporter.getInstance();
    this.initializeAnalytics();
    this.initializePerformanceTracking();
    this.initializeSession();
    this.setupPerformanceObserver();
  }

  static getInstance(): ErrorMonitoringService {
    if (!ErrorMonitoringService.instance) {
      ErrorMonitoringService.instance = new ErrorMonitoringService();
    }
    return ErrorMonitoringService.instance;
  }

  private initializeAnalytics(): void {
    this.analytics = {
      errorCount: 0,
      errorsByType: {},
      errorsByComponent: {},
      recentErrors: [],
      networkErrors: 0,
      componentErrors: 0,
      apiErrors: 0
    };
  }

  private initializePerformanceTracking(): void {
    this.performance = {
      pageLoadTime: performance.now(),
      apiResponseTimes: {},
      componentRenderTimes: {},
      memoryUsage: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : undefined
    };
  }

  private initializeSession(): void {
    this.session = {
      sessionId: this.generateSessionId(),
      userAgent: navigator.userAgent,
      startTime: new Date(),
      pageViews: [window.location.pathname],
      actions: []
    };
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private setupPerformanceObserver(): void {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'longtask') {
              this.reportPerformanceIssue('Long Task', {
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Performance observer not supported:', error);
      }
    }

    // Monitor memory usage periodically
    setInterval(() => {
      this.updateMemoryUsage();
    }, 30000); // Every 30 seconds
  }

  private updateMemoryUsage(): void {
    if ((performance as any).memory) {
      this.performance.memoryUsage = {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      };

      // Alert if memory usage is high
      const usagePercent = (this.performance.memoryUsage.usedJSHeapSize / this.performance.memoryUsage.jsHeapSizeLimit) * 100;
      if (usagePercent > 80) {
        this.reportPerformanceIssue('High Memory Usage', {
          usagePercent,
          memoryUsage: this.performance.memoryUsage
        });
      }
    }
  }

  // Report errors with enhanced context
  reportError(error: Error | AppError, context?: any): void {
    const errorContext = {
      ...collectErrorContext(),
      ...context,
      sessionId: this.session.sessionId,
      userId: this.session.userId,
      pageViews: this.session.pageViews,
      recentActions: this.session.actions.slice(-5) // Last 5 actions
    };

    // Update analytics
    this.analytics.errorCount++;
    
    const errorCode = error instanceof AppError ? error.code : 'UNKNOWN_ERROR';
    const severity = error instanceof AppError ? error.severity : ErrorSeverity.MEDIUM;
    
    this.analytics.errorsByType[errorCode] = (this.analytics.errorsByType[errorCode] || 0) + 1;
    
    if (context?.component) {
      this.analytics.errorsByComponent[context.component] = (this.analytics.errorsByComponent[context.component] || 0) + 1;
      this.analytics.componentErrors++;
    }
    
    if (context?.type === 'network' || errorCode.includes('NETWORK')) {
      this.analytics.networkErrors++;
    }
    
    if (context?.type === 'api' || context?.operation) {
      this.analytics.apiErrors++;
    }

    // Add to recent errors
    this.analytics.recentErrors.unshift({
      timestamp: new Date(),
      message: error.message,
      code: errorCode,
      severity,
      context: errorContext
    });

    // Keep only last 50 errors
    if (this.analytics.recentErrors.length > 50) {
      this.analytics.recentErrors = this.analytics.recentErrors.slice(0, 50);
    }

    // Report to error tracking service
    this.errorReporter.report(error, errorContext);

    // Log critical errors immediately
    if (severity === ErrorSeverity.CRITICAL) {
      console.error('CRITICAL ERROR:', error, errorContext);
      this.sendImmediateAlert(error, errorContext);
    }
  }

  // Track API performance
  trackApiCall(endpoint: string, duration: number, success: boolean): void {
    if (!this.performance.apiResponseTimes[endpoint]) {
      this.performance.apiResponseTimes[endpoint] = [];
    }
    
    this.performance.apiResponseTimes[endpoint].push(duration);
    
    // Keep only last 100 measurements per endpoint
    if (this.performance.apiResponseTimes[endpoint].length > 100) {
      this.performance.apiResponseTimes[endpoint] = this.performance.apiResponseTimes[endpoint].slice(-100);
    }

    // Report slow API calls
    if (duration > 5000) { // 5 seconds
      this.reportPerformanceIssue('Slow API Call', {
        endpoint,
        duration,
        success
      });
    }

    // Track user action
    this.trackUserAction('api_call', {
      endpoint,
      duration,
      success
    });
  }

  // Track component performance
  trackComponentRender(componentName: string, duration: number): void {
    if (!this.performance.componentRenderTimes[componentName]) {
      this.performance.componentRenderTimes[componentName] = [];
    }
    
    this.performance.componentRenderTimes[componentName].push(duration);
    
    // Keep only last 50 measurements per component
    if (this.performance.componentRenderTimes[componentName].length > 50) {
      this.performance.componentRenderTimes[componentName] = this.performance.componentRenderTimes[componentName].slice(-50);
    }

    // Report slow renders
    if (duration > 100) { // 100ms
      this.reportPerformanceIssue('Slow Component Render', {
        component: componentName,
        duration
      });
    }
  }

  // Track user actions
  trackUserAction(actionType: string, details?: any): void {
    this.session.actions.push({
      type: actionType,
      timestamp: new Date(),
      details
    });

    // Keep only last 100 actions
    if (this.session.actions.length > 100) {
      this.session.actions = this.session.actions.slice(-100);
    }
  }

  // Track page views
  trackPageView(path: string): void {
    this.session.pageViews.push(path);
    this.trackUserAction('page_view', { path });
  }

  // Set user context
  setUserContext(userId: number): void {
    this.session.userId = userId;
  }

  // Report performance issues
  private reportPerformanceIssue(type: string, details: any): void {
    const performanceError = new AppError(
      `Performance Issue: ${type}`,
      'PERFORMANCE_ISSUE',
      details,
      ErrorSeverity.MEDIUM
    );

    this.reportError(performanceError, {
      type: 'performance',
      performanceType: type,
      ...details
    });
  }

  // Send immediate alerts for critical errors
  private sendImmediateAlert(error: Error, context: any): void {
    // In production, this would send to alerting service
    console.error('IMMEDIATE ALERT - CRITICAL ERROR:', {
      error: {
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString()
    });

    // Could integrate with services like PagerDuty, Slack, etc.
  }

  // Get analytics summary
  getAnalytics(): ErrorAnalytics {
    return { ...this.analytics };
  }

  // Get performance metrics
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performance };
  }

  // Get session information
  getSessionInfo(): SessionContext {
    return { ...this.session };
  }

  // Generate error report for support
  generateErrorReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      session: this.session,
      analytics: this.analytics,
      performance: this.performance,
      browser: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      },
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      }
    };

    return JSON.stringify(report, null, 2);
  }

  // Clear analytics data
  clearAnalytics(): void {
    this.initializeAnalytics();
  }

  // Export data for debugging
  exportDebugData(): any {
    return {
      analytics: this.analytics,
      performance: this.performance,
      session: this.session,
      unreportedErrors: this.errorReporter.getUnreportedCount()
    };
  }
}

// Export singleton instance
export const errorMonitoring = ErrorMonitoringService.getInstance();

// React hook for error monitoring
export function useErrorMonitoring() {
  const monitoring = ErrorMonitoringService.getInstance();

  return {
    reportError: (error: Error, context?: any) => monitoring.reportError(error, context),
    trackApiCall: (endpoint: string, duration: number, success: boolean) => 
      monitoring.trackApiCall(endpoint, duration, success),
    trackComponentRender: (componentName: string, duration: number) => 
      monitoring.trackComponentRender(componentName, duration),
    trackUserAction: (actionType: string, details?: any) => 
      monitoring.trackUserAction(actionType, details),
    trackPageView: (path: string) => monitoring.trackPageView(path),
    setUserContext: (userId: number) => monitoring.setUserContext(userId),
    getAnalytics: () => monitoring.getAnalytics(),
    generateErrorReport: () => monitoring.generateErrorReport()
  };
}