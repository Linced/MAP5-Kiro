import { ErrorSeverity, getUserFriendlyMessage, classifyError } from '../../utils/errors';

// Generic error fallback props
interface ErrorFallbackProps {
  error?: Error | any;
  onRetry?: () => void;
  onReset?: () => void;
  showDetails?: boolean;
}

// Network error fallback
export function NetworkErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Connection Problem
      </h3>
      
      <p className="text-gray-600 mb-4 max-w-md">
        {getUserFriendlyMessage(error)}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// Loading error fallback
export function LoadingErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-gray-50 rounded-lg">
      <div className="w-12 h-12 mb-3 bg-yellow-100 rounded-full flex items-center justify-center">
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      
      <h4 className="text-md font-medium text-gray-900 mb-2">
        Failed to Load
      </h4>
      
      <p className="text-sm text-gray-600 mb-3">
        {getUserFriendlyMessage(error)}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// Form error fallback
export function FormErrorFallback({ error }: ErrorFallbackProps) {
  const severity = classifyError(error);
  const isHighSeverity = severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL;
  
  return (
    <div className={`p-3 rounded-md ${isHighSeverity ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg 
            className={`h-5 w-5 ${isHighSeverity ? 'text-red-400' : 'text-yellow-400'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="ml-3">
          <p className={`text-sm font-medium ${isHighSeverity ? 'text-red-800' : 'text-yellow-800'}`}>
            {getUserFriendlyMessage(error)}
          </p>
        </div>
      </div>
    </div>
  );
}

// Chart error fallback
export function ChartErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <div className="w-12 h-12 mb-3 bg-gray-200 rounded-full flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      
      <h4 className="text-md font-medium text-gray-700 mb-2">
        Chart Unavailable
      </h4>
      
      <p className="text-sm text-gray-500 mb-3 text-center max-w-xs">
        {getUserFriendlyMessage(error)}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
        >
          Reload Chart
        </button>
      )}
    </div>
  );
}

// Table error fallback
export function TableErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Unable to Load Data
      </h3>
      
      <p className="text-gray-600 mb-4">
        {getUserFriendlyMessage(error)}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Reload Data
        </button>
      )}
    </div>
  );
}

// File upload error fallback
export function UploadErrorFallback({ error, onRetry, onReset }: ErrorFallbackProps) {
  return (
    <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      <h3 className="text-md font-semibold text-red-900 mb-2">
        Upload Failed
      </h3>
      
      <p className="text-red-700 mb-4">
        {getUserFriendlyMessage(error)}
      </p>
      
      <div className="flex justify-center space-x-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-red-600 text-white px-3 py-2 text-sm rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="bg-gray-600 text-white px-3 py-2 text-sm rounded hover:bg-gray-700 transition-colors"
          >
            Choose Different File
          </button>
        )}
      </div>
    </div>
  );
}

// Generic error fallback with customizable severity
export function GenericErrorFallback({ error, onRetry, onReset, showDetails = false }: ErrorFallbackProps) {
  const severity = classifyError(error);
  const message = getUserFriendlyMessage(error);
  
  const getSeverityStyles = () => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return {
          bg: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          title: 'text-red-900',
          text: 'text-red-700'
        };
      case ErrorSeverity.HIGH:
        return {
          bg: 'bg-orange-50 border-orange-200',
          icon: 'text-orange-600',
          title: 'text-orange-900',
          text: 'text-orange-700'
        };
      case ErrorSeverity.MEDIUM:
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-900',
          text: 'text-yellow-700'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          text: 'text-blue-700'
        };
    }
  };
  
  const styles = getSeverityStyles();
  
  return (
    <div className={`p-4 rounded-lg border ${styles.bg}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className={`h-5 w-5 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${styles.title} mb-1`}>
            Something went wrong
          </h3>
          
          <p className={`text-sm ${styles.text} mb-3`}>
            {message}
          </p>
          
          {showDetails && error && process.env.NODE_ENV === 'development' && (
            <details className="mb-3">
              <summary className={`text-xs ${styles.text} cursor-pointer`}>
                Technical Details
              </summary>
              <pre className={`text-xs ${styles.text} mt-1 whitespace-pre-wrap font-mono`}>
                {error.stack || error.message || String(error)}
              </pre>
            </details>
          )}
          
          <div className="flex space-x-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            )}
            {onReset && (
              <button
                onClick={onReset}
                className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Offline fallback
export function OfflineFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-lg">
      <div className="w-16 h-16 mb-4 bg-gray-200 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75A9.75 9.75 0 0012 2.25z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        You're Offline
      </h3>
      
      <p className="text-gray-600 mb-4 max-w-md">
        Please check your internet connection and try again.
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}