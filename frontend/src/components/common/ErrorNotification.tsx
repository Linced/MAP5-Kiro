import React, { useState, useEffect } from 'react';
import { AppError, getUserFriendlyMessage } from '../../utils/errors';

interface ErrorNotificationProps {
  error: Error | AppError | null;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
  showRetry?: boolean;
  onRetry?: () => void;
  position?: 'top' | 'bottom';
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onDismiss,
  autoHide = true,
  autoHideDelay = 5000,
  showRetry = false,
  onRetry,
  position = 'top'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      
      if (autoHide) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => onDismiss?.(), 300); // Wait for animation
        }, autoHideDelay);
        
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [error, autoHide, autoHideDelay, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  };

  const handleRetry = () => {
    setIsVisible(false);
    setTimeout(() => {
      onRetry?.();
      onDismiss?.();
    }, 300);
  };

  if (!error) return null;

  const message = getUserFriendlyMessage(error);
  const isAppError = error instanceof AppError;
  const severity = isAppError ? error.severity : 'medium';

  const getColorClasses = () => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  const getIconColor = () => {
    switch (severity) {
      case 'critical':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-blue-400';
      default:
        return 'text-red-400';
    }
  };

  const positionClasses = position === 'top' 
    ? 'top-4 left-1/2 transform -translate-x-1/2' 
    : 'bottom-4 left-1/2 transform -translate-x-1/2';

  return (
    <div
      className={`fixed ${positionClasses} z-50 max-w-md w-full mx-auto transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className={`rounded-lg border p-4 shadow-lg ${getColorClasses()}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className={`h-5 w-5 ${getIconColor()}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">{message}</p>
            
            {process.env.NODE_ENV === 'development' && isAppError && error.code && (
              <p className="mt-1 text-xs opacity-75">
                Error Code: {error.code}
              </p>
            )}
          </div>
          
          <div className="ml-4 flex space-x-2">
            {showRetry && onRetry && (
              <button
                onClick={handleRetry}
                className="text-sm font-medium underline hover:no-underline focus:outline-none"
              >
                Retry
              </button>
            )}
            
            <button
              onClick={handleDismiss}
              className="text-sm font-medium underline hover:no-underline focus:outline-none"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast-style error notifications
interface ErrorToastProps {
  errors: Array<{
    id: string;
    error: Error | AppError;
    timestamp: Date;
  }>;
  onDismiss: (id: string) => void;
  maxToasts?: number;
}

export const ErrorToastContainer: React.FC<ErrorToastProps> = ({
  errors,
  onDismiss,
  maxToasts = 3
}) => {
  const visibleErrors = errors.slice(-maxToasts);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {visibleErrors.map((errorItem, index) => (
        <ErrorToast
          key={errorItem.id}
          error={errorItem.error}
          onDismiss={() => onDismiss(errorItem.id)}
          delay={index * 100} // Stagger animations
        />
      ))}
    </div>
  );
};

interface ErrorToastSingleProps {
  error: Error | AppError;
  onDismiss: () => void;
  delay?: number;
}

const ErrorToast: React.FC<ErrorToastSingleProps> = ({
  error,
  onDismiss,
  delay = 0
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), delay);
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000 + delay);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [delay, onDismiss]);

  const message = getUserFriendlyMessage(error);
  const isAppError = error instanceof AppError;
  const severity = isAppError ? error.severity : 'medium';

  const getColorClasses = () => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-red-500 text-white';
    }
  };

  return (
    <div
      className={`transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`rounded-lg shadow-lg p-4 max-w-sm ${getColorClasses()}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium">{message}</p>
          </div>
          
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="ml-2 text-white hover:text-gray-200 focus:outline-none"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook for managing error notifications
export function useErrorNotifications() {
  const [errors, setErrors] = useState<Array<{
    id: string;
    error: Error | AppError;
    timestamp: Date;
  }>>([]);

  const addError = (error: Error | AppError) => {
    const id = `error-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    setErrors(prev => [...prev, { id, error, timestamp: new Date() }]);
  };

  const removeError = (id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  };

  const clearAll = () => {
    setErrors([]);
  };

  return {
    errors,
    addError,
    removeError,
    clearAll
  };
}