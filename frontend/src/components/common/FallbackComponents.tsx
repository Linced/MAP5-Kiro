import React from 'react';

// Generic fallback component for any component failure
export const GenericFallback: React.FC<{ 
  componentName?: string;
  error?: Error;
  onRetry?: () => void;
}> = ({ componentName = 'Component', error, onRetry }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full mb-4">
      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      {componentName} Unavailable
    </h3>
    
    <p className="text-gray-600 text-center mb-4 max-w-md">
      This component encountered an error and couldn't load properly. You can try refreshing or continue using other features.
    </p>

    {process.env.NODE_ENV === 'development' && error && (
      <details className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm max-w-md">
        <summary className="text-red-800 cursor-pointer font-medium">Error Details</summary>
        <p className="text-red-700 font-mono text-xs mt-1 break-all">
          {error.message}
        </p>
      </details>
    )}
    
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

// Fallback for data table component
export const DataTableFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="bg-white rounded-lg shadow border border-gray-200">
    <div className="p-6 text-center">
      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full mb-4">
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">Data Table Unavailable</h3>
      <p className="text-gray-600 mb-4">
        The data table couldn't load. Your data is safe, but the display component encountered an issue.
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors mr-2"
        >
          Reload Table
        </button>
      )}
      
      <button
        onClick={() => window.location.reload()}
        className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
      >
        Refresh Page
      </button>
    </div>
  </div>
);

// Fallback for chart components
export const ChartFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="bg-white rounded-lg shadow border border-gray-200 h-96 flex items-center justify-center">
    <div className="text-center">
      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full mb-4">
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">Chart Unavailable</h3>
      <p className="text-gray-600 mb-4">
        The chart visualization couldn't load. Try refreshing or check your data.
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
        >
          Reload Chart
        </button>
      )}
    </div>
  </div>
);

// Fallback for upload component
export const UploadFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
    <div className="text-center">
      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-purple-100 rounded-full mb-4">
        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Feature Unavailable</h3>
      <p className="text-gray-600 mb-4">
        The file upload component couldn't load. You can try refreshing the page.
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors mr-2"
        >
          Try Again
        </button>
      )}
      
      <button
        onClick={() => window.location.href = '/dashboard'}
        className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  </div>
);

// Fallback for strategy components
export const StrategyFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
    <div className="text-center">
      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-indigo-100 rounded-full mb-4">
        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">Strategy Manager Unavailable</h3>
      <p className="text-gray-600 mb-4">
        The strategy management component couldn't load. Your strategies are safe.
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors mr-2"
        >
          Reload Strategies
        </button>
      )}
      
      <button
        onClick={() => window.location.href = '/dashboard'}
        className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  </div>
);

// Loading fallback for when components are loading
export const LoadingFallback: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => (
  <div className="flex flex-col items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
    <p className="text-gray-600">{message}</p>
  </div>
);

// Network error fallback
export const NetworkErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    
    <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Problem</h3>
    <p className="text-gray-600 text-center mb-4 max-w-md">
      Unable to connect to the server. Please check your internet connection and try again.
    </p>
    
    {onRetry && (
      <button
        onClick={onRetry}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    )}
  </div>
);

// Empty state fallback
export const EmptyStateFallback: React.FC<{ 
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="text-center py-12">
    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-gray-100 rounded-full mb-4">
      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    </div>
    
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-4 max-w-md mx-auto">{description}</p>
    
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);