import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AppError, ErrorReporter, getUserFriendlyMessage } from '../utils/errors';
import { errorMonitoring } from '../services/errorMonitoring';
import { ErrorToastContainer, useErrorNotifications } from '../components/common/ErrorNotification';

interface ErrorContextType {
  // Error reporting
  reportError: (error: Error | AppError, context?: any) => void;
  
  // User notifications
  showError: (error: Error | AppError, options?: {
    showRetry?: boolean;
    onRetry?: () => void;
    autoHide?: boolean;
  }) => void;
  
  // Error state management
  hasErrors: boolean;
  clearErrors: () => void;
  
  // Network status
  isOnline: boolean;
  
  // Error analytics
  getErrorAnalytics: () => any;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { errors, addError, removeError, clearAll } = useErrorNotifications();

  // Monitor network status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Report error to monitoring service
  const reportError = useCallback((error: Error | AppError, context?: any) => {
    // Report to error monitoring service
    errorMonitoring.reportError(error, {
      ...context,
      isOnline,
      timestamp: new Date().toISOString()
    });

    // Report to error tracking service
    ErrorReporter.getInstance().report(error, context);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error reported:', error, context);
    }
  }, [isOnline]);

  // Show error notification to user
  const showError = useCallback((
    error: Error | AppError, 
    options?: {
      showRetry?: boolean;
      onRetry?: () => void;
      autoHide?: boolean;
    }
  ) => {
    // Add to notification queue
    addError(error);

    // Report the error
    reportError(error, {
      userNotified: true,
      notificationOptions: options
    });
  }, [addError, reportError]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    clearAll();
  }, [clearAll]);

  // Get error analytics
  const getErrorAnalytics = useCallback(() => {
    return errorMonitoring.getAnalytics();
  }, []);

  const contextValue: ErrorContextType = {
    reportError,
    showError,
    hasErrors: errors.length > 0,
    clearErrors,
    isOnline,
    getErrorAnalytics
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
      
      {/* Error notification toasts */}
      <ErrorToastContainer
        errors={errors}
        onDismiss={removeError}
        maxToasts={3}
      />
    </ErrorContext.Provider>
  );
};

// Hook to use error context
export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

// Higher-order component to wrap components with error handling
export function withErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return function ErrorHandledComponent(props: P) {
    const { reportError } = useError();

    const handleError = useCallback((error: Error, errorInfo: any) => {
      reportError(error, {
        component: componentName || Component.name,
        errorInfo,
        props: process.env.NODE_ENV === 'development' ? props : undefined
      });
    }, [reportError, props]);

    return (
      <ErrorBoundary onError={handleError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Simple error boundary for the HOC
class ErrorBoundary extends React.Component<
  { children: ReactNode; onError: (error: Error, errorInfo: any) => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.props.onError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">
            Something went wrong with this component. Please refresh the page.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for handling async operations with error reporting
export function useAsyncError() {
  const { reportError, showError } = useError();

  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: {
      showUserError?: boolean;
      errorContext?: any;
      onError?: (error: Error) => void;
    }
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error: any) {
      const appError = error instanceof AppError ? error : new AppError(
        error.message || 'Operation failed',
        'ASYNC_OPERATION_ERROR'
      );

      // Report error
      reportError(appError, options?.errorContext);

      // Show user notification if requested
      if (options?.showUserError) {
        showError(appError);
      }

      // Call custom error handler
      if (options?.onError) {
        options.onError(appError);
      }

      return null;
    }
  }, [reportError, showError]);

  return { handleAsyncOperation };
}

// Hook for form error handling
export function useFormError() {
  const { showError } = useError();

  const handleFormError = useCallback((error: any, formName?: string) => {
    const appError = error instanceof AppError ? error : new AppError(
      getUserFriendlyMessage(error),
      'FORM_ERROR',
      undefined,
      { formName, originalError: error }
    );

    showError(appError, {
      autoHide: true,
      showRetry: false
    });

    return getUserFriendlyMessage(appError);
  }, [showError]);

  return { handleFormError };
}