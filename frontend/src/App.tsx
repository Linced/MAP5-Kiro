import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { LoginForm, RegisterForm, ProtectedRoute, EmailVerification } from './components/auth';
import { Dashboard } from './components/layout/Dashboard';
import { UploadPage } from './components/upload';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ErrorMonitoringToggle } from './components/common/ErrorMonitoringDashboard';
import { ErrorReporter } from './utils/errors';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Lazy load heavy components that contain charts and calculations
const DataPage = lazy(() => import('./components/data').then(module => ({ default: module.DataPage })));
const StrategyPage = lazy(() => import('./components/strategies').then(module => ({ default: module.StrategyPage })));

function App() {
  const handleGlobalError = (error: Error, errorInfo: any) => {
    // Report error to error tracking service
    ErrorReporter.getInstance().report(error, {
      ...errorInfo,
      type: 'react_error_boundary'
    });
  };

  return (
    <ErrorBoundary onError={handleGlobalError}>
      <ErrorProvider>
        <AuthProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={<LoginForm />} />
              <Route path="/register" element={<RegisterForm />} />
              <Route path="/verify-email" element={<EmailVerification />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/upload" 
                element={
                  <ProtectedRoute>
                    <UploadPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/data" 
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingSpinner />}>
                      <DataPage />
                    </Suspense>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/strategies" 
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingSpinner />}>
                      <StrategyPage />
                    </Suspense>
                  </ProtectedRoute>
                } 
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            
            {/* Error monitoring dashboard for development - temporarily disabled */}
            {/* <ErrorMonitoringToggle /> */}
          </Router>
        </AuthProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;