import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginForm, RegisterForm, ProtectedRoute, EmailVerification } from './components/auth';
import { Dashboard } from './components/layout/Dashboard';
import { AppLayout } from './components/layout/AppLayout';
import { UploadPage } from './components/upload';
import { TableSummaryPage } from './components/table-summary';
import { TagsPage } from './components/tags';
import { SettingsPage } from './components/settings';
import { ChartsPage } from './pages/ChartsPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ErrorMonitoringToggle } from './components/common/ErrorMonitoringDashboard';
import { ErrorReporter } from './utils/errors';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { NotFound } from './components/common/NotFound';

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
      <ThemeProvider>
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
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/upload" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <UploadPage />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/table-summary" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <TableSummaryPage />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/data" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingSpinner />}>
                        <DataPage />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/strategies" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingSpinner />}>
                        <StrategyPage />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tags" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <TagsPage />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/charts" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ChartsPage />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <SettingsPage />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            {/* Error monitoring dashboard for development - temporarily disabled */}
            {/* <ErrorMonitoringToggle /> */}
          </Router>
        </AuthProvider>
      </ErrorProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;