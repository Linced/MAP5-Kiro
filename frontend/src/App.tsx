import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { LoginForm, RegisterForm, ProtectedRoute, EmailVerification } from './components/auth';
import { Dashboard } from './components/layout/Dashboard';
import { UploadPage } from './components/upload';
import { DataPage } from './components/data';
import { StrategyPage } from './components/strategies';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ErrorMonitoringToggle } from './components/common/ErrorMonitoringDashboard';
import { ErrorReporter } from './utils/errors';

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
          <Router>
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
                    <DataPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/strategies" 
                element={
                  <ProtectedRoute>
                    <StrategyPage />
                  </ProtectedRoute>
                } 
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            
            {/* Error monitoring dashboard for development */}
            <ErrorMonitoringToggle />
          </Router>
        </AuthProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;