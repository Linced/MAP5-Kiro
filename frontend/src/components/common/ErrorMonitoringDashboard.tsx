import React, { useState, useEffect } from 'react';
import { errorMonitoring } from '../../services/errorMonitoring';
import { useError } from '../../contexts/ErrorContext';

interface ErrorMonitoringDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ErrorMonitoringDashboard: React.FC<ErrorMonitoringDashboardProps> = ({
  isOpen,
  onClose
}) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const { clearErrors } = useError();

  useEffect(() => {
    if (isOpen) {
      const updateData = () => {
        setAnalytics(errorMonitoring.getAnalytics());
        setPerformance(errorMonitoring.getPerformanceMetrics());
        setSession(errorMonitoring.getSessionInfo());
      };

      updateData();
      const interval = setInterval(updateData, 5000); // Update every 5 seconds

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleExportReport = () => {
    const report = errorMonitoring.generateErrorReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearAnalytics = () => {
    errorMonitoring.clearAnalytics();
    clearErrors();
    setAnalytics(errorMonitoring.getAnalytics());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Error Monitoring Dashboard</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleExportReport}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Export Report
            </button>
            <button
              onClick={handleClearAnalytics}
              className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Clear Data
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Error Analytics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Error Analytics</h3>
              {analytics && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Errors:</span>
                    <span className="text-sm font-medium">{analytics.errorCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Network Errors:</span>
                    <span className="text-sm font-medium">{analytics.networkErrors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Component Errors:</span>
                    <span className="text-sm font-medium">{analytics.componentErrors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">API Errors:</span>
                    <span className="text-sm font-medium">{analytics.apiErrors}</span>
                  </div>

                  {/* Error Types */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Error Types</h4>
                    <div className="space-y-1">
                      {Object.entries(analytics.errorsByType).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-xs">
                          <span className="text-gray-600">{type}:</span>
                          <span className="font-medium">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Error by Component */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Errors by Component</h4>
                    <div className="space-y-1">
                      {Object.entries(analytics.errorsByComponent).map(([component, count]) => (
                        <div key={component} className="flex justify-between text-xs">
                          <span className="text-gray-600">{component}:</span>
                          <span className="font-medium">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Performance Metrics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
              {performance && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Page Load Time:</span>
                    <span className="text-sm font-medium">{Math.round(performance.pageLoadTime)}ms</span>
                  </div>

                  {/* Memory Usage */}
                  {performance.memoryUsage && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Memory Usage</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Used:</span>
                          <span className="font-medium">
                            {Math.round(performance.memoryUsage.usedJSHeapSize / 1024 / 1024)}MB
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-medium">
                            {Math.round(performance.memoryUsage.totalJSHeapSize / 1024 / 1024)}MB
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Limit:</span>
                          <span className="font-medium">
                            {Math.round(performance.memoryUsage.jsHeapSizeLimit / 1024 / 1024)}MB
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* API Response Times */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">API Response Times (avg)</h4>
                    <div className="space-y-1">
                      {Object.entries(performance.apiResponseTimes).map(([endpoint, times]) => {
                        const avg = (times as number[]).reduce((a, b) => a + b, 0) / (times as number[]).length;
                        return (
                          <div key={endpoint} className="flex justify-between text-xs">
                            <span className="text-gray-600 truncate">{endpoint}:</span>
                            <span className="font-medium">{Math.round(avg)}ms</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Component Render Times */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Component Render Times (avg)</h4>
                    <div className="space-y-1">
                      {Object.entries(performance.componentRenderTimes).map(([component, times]) => {
                        const avg = (times as number[]).reduce((a, b) => a + b, 0) / (times as number[]).length;
                        return (
                          <div key={component} className="flex justify-between text-xs">
                            <span className="text-gray-600">{component}:</span>
                            <span className="font-medium">{Math.round(avg)}ms</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Session Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Session Information</h3>
              {session && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Session ID:</span>
                    <span className="text-xs font-mono">{session.sessionId.substring(0, 16)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Start Time:</span>
                    <span className="text-sm font-medium">
                      {new Date(session.startTime).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Page Views:</span>
                    <span className="text-sm font-medium">{session.pageViews.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">User Actions:</span>
                    <span className="text-sm font-medium">{session.actions.length}</span>
                  </div>

                  {/* Recent Page Views */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Page Views</h4>
                    <div className="space-y-1">
                      {session.pageViews.slice(-5).map((path: string, index: number) => (
                        <div key={index} className="text-xs text-gray-600">{path}</div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Actions */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Actions</h4>
                    <div className="space-y-1">
                      {session.actions.slice(-5).map((action: any, index: number) => (
                        <div key={index} className="text-xs text-gray-600">
                          {action.type} - {new Date(action.timestamp).toLocaleTimeString()}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Errors */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Errors</h3>
              {analytics && analytics.recentErrors && (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {analytics.recentErrors.slice(0, 10).map((error: any, index: number) => (
                    <div key={index} className="border-l-4 border-red-400 pl-3 py-2 bg-white rounded">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{error.message}</p>
                          <p className="text-xs text-gray-600 mt-1">Code: {error.code}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(error.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          error.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          error.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          error.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {error.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Development-only error monitoring toggle
export const ErrorMonitoringToggle: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 z-40"
        title="Error Monitoring Dashboard"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>

      <ErrorMonitoringDashboard
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};