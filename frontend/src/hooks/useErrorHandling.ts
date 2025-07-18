import { useCallback, useEffect } from 'react';
import { useErrorMonitoring } from '../services/errorMonitoring';
import { AppError, ErrorCodes, getUserFriendlyMessage } from '../utils/errors';

// Hook for component-level error handling
export function useErrorHandling(componentName: string) {
  const { reportError, trackComponentRender, trackUserAction } = useErrorMonitoring();

  // Report component errors
  const handleError = useCallback((error: Error | AppError, context?: any) => {
    reportError(error, {
      component: componentName,
      type: 'component',
      ...context
    });
  }, [reportError, componentName]);

  // Handle async operations with error catching
  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    onError?: (error: Error) => void
  ): Promise<T | null> => {
    try {
      const startTime = performance.now();
      const result = await operation();
      const duration = performance.now() - startTime;
      
      // Track successful operation
      trackUserAction(`${componentName}_${operationName}_success`, {
        duration,
        component: componentName
      });
      
      return result;
    } catch (error: any) {
      const appError = error instanceof AppError ? error : new AppError(
        error.message || 'Operation failed',
        ErrorCodes.COMPONENT_ERROR,
        undefined,
        { originalError: error }
      );

      handleError(appError, {
        operation: operationName,
        timestamp: new Date().toISOString()
      });

      if (onError) {
        onError(appError);
      }

      return null;
    }
  }, [handleError, trackUserAction, componentName]);

  // Track component render performance
  const trackRender = useCallback((renderTime: number) => {
    trackComponentRender(componentName, renderTime);
  }, [trackComponentRender, componentName]);

  // Create user-friendly error message
  const createUserMessage = useCallback((error: Error | AppError): string => {
    return getUserFriendlyMessage(error);
  }, []);

  return {
    handleError,
    handleAsyncOperation,
    trackRender,
    createUserMessage,
    trackUserAction: (action: string, details?: any) => 
      trackUserAction(`${componentName}_${action}`, { component: componentName, ...details })
  };
}

// Hook for form error handling
export function useFormErrorHandling() {
  const { handleError, createUserMessage } = useErrorHandling('Form');

  const handleValidationError = useCallback((field: string, message: string) => {
    const error = new AppError(
      `Validation error in ${field}: ${message}`,
      ErrorCodes.VALIDATION_ERROR,
      undefined,
      { field, validationMessage: message }
    );
    
    handleError(error, { type: 'validation', field });
    return message;
  }, [handleError]);

  const handleSubmissionError = useCallback((error: any, formName: string) => {
    const appError = error instanceof AppError ? error : new AppError(
      'Form submission failed',
      ErrorCodes.VALIDATION_ERROR,
      undefined,
      { originalError: error, formName }
    );

    handleError(appError, { type: 'form_submission', formName });
    return createUserMessage(appError);
  }, [handleError, createUserMessage]);

  return {
    handleValidationError,
    handleSubmissionError,
    createUserMessage
  };
}

// Hook for API error handling
export function useApiErrorHandling() {
  const { handleError, createUserMessage } = useErrorHandling('API');

  const handleApiError = useCallback((error: any, endpoint: string, operation: string) => {
    const appError = error instanceof AppError ? error : new AppError(
      `API ${operation} failed`,
      error.response?.data?.error?.code || ErrorCodes.NETWORK_ERROR,
      undefined,
      {
        endpoint,
        status: error.response?.status,
        originalError: error
      }
    );

    handleError(appError, {
      type: 'api',
      endpoint,
      operation,
      status: error.response?.status
    });

    return createUserMessage(appError);
  }, [handleError, createUserMessage]);

  return {
    handleApiError,
    createUserMessage
  };
}

// Performance monitoring hook
export function usePerformanceMonitoring(componentName: string) {
  const { trackComponentRender, trackUserAction } = useErrorMonitoring();

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      trackComponentRender(componentName, renderTime);
    };
  }, [componentName, trackComponentRender]);

  const measureOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      trackUserAction(`${componentName}_${operationName}`, {
        duration,
        success: true,
        component: componentName
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      trackUserAction(`${componentName}_${operationName}`, {
        duration,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        component: componentName
      });
      
      throw error;
    }
  }, [componentName, trackUserAction]);

  return {
    measureOperation
  };
}