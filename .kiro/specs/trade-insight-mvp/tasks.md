# Implementation Plan

- [x] 1. Set up project structure and core interfaces

  - Create monorepo structure with frontend (React/TypeScript/Vite) and backend (Node.js/Express/TypeScript)
  - Set up package.json files with all required dependencies
  - Configure TypeScript configs for both frontend and backend
  - Create basic folder structure for components, services, and utilities
  - _Requirements: 8.1, 8.6_

- [x] 2. Initialize SQLite database and connection utilities

  - Create database initialization script with all required tables (users, uploads, data_rows, calculated_columns, strategies, strategy_buckets, tags, strategy_tags)
  - Implement database connection utilities and query helpers
  - Create TypeScript interfaces for all database models
  - Write database migration utilities for schema updates
  - _Requirements: 2.5, 8.1_

- [x] 3. Implement user authentication system

  - Create User model with password hashing using bcrypt
  - Implement JWT token generation and verification utilities
  - Build registration endpoint with email validation
  - Build login endpoint with credential verification
  - Create email verification system using Gmail SMTP
  - Write authentication middleware for protected routes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 4. Build CSV upload and processing system

  - Create file upload middleware using Multer with size and type validation
  - Implement CSV parsing service using csv-parser library
  - Build data storage service to save parsed CSV data to SQLite
  - Create upload metadata tracking system
  - Write error handling for invalid CSV formats and processing failures
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 5. Create data retrieval and table API

  - Build data query service with pagination, sorting, and filtering
  - Implement column information retrieval for dynamic table headers
  - Create API endpoints for data retrieval with query parameters
  - Write data transformation utilities for frontend consumption
  - Add performance optimizations for large datasets
  - _Requirements: 3.1, 3.2, 3.4, 3.6_

- [x] 6. Implement calculation engine

  - Create formula parser using Math.js for safe evaluation
  - Build column reference resolver for bracket notation ([Column] syntax)
  - Implement formula validation with error reporting
  - Create calculated column storage and retrieval system
  - Write preview generation for formula results
  - Add error handling for division by zero and invalid operations
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 7. Build chart data API

  - Create chart data service to format data for Chart.js
  - Implement data aggregation utilities for chart optimization
  - Build API endpoints for line and bar chart data
  - Add data validation for chart requirements
  - Write performance optimizations for chart data queries
  - _Requirements: 5.1, 5.2, 5.6_

- [x] 8. Create authentication frontend components

  - Build LoginForm component with validation and error handling
  - Create RegisterForm component with email verification flow
  - Implement AuthProvider context for global authentication state
  - Create ProtectedRoute wrapper for authenticated pages
  - Build authentication API service with JWT handling
  - Add localStorage management for authentication tokens
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 9. Build file upload frontend interface

  - Create FileUpload component with drag-and-drop support
  - Implement upload progress indication and error display
  - Build file validation on the frontend (size, type checking)
  - Create upload success feedback with row count display
  - Add upload history and file management interface
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 10. Implement data table with TanStack Table

  - Create DataTable component with sorting and filtering capabilities
  - Build ColumnToggle component for show/hide column functionality
  - Implement pagination controls with page navigation
  - Add table state management for sorting and filtering persistence
  - Create responsive table design for mobile compatibility
  - Write loading states and empty data handling
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 11. Build calculation interface components

  - Create FormulaBuilder component with syntax highlighting
  - Implement CalcPreview component showing first 10 calculated values
  - Build ColumnManager for managing calculated columns
  - Add formula validation with real-time error feedback
  - Create calculated column deletion and editing functionality
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 12. Implement chart visualization components

  - Create LineChart component using Chart.js with basic interactivity
  - Build BarChart component with hover tooltips and zoom functionality
  - Implement ChartControls for axis selection and chart type switching
  - Add chart loading states and error handling
  - Create responsive chart design for different screen sizes
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 13. Create strategy management backend services

  - Build StrategyService with CRUD operations for trading strategies
  - Implement BucketService for strategy categorization
  - Create TagService for strategy tagging system
  - Build strategy-bucket assignment functionality
  - Implement strategy-tag many-to-many relationship management
  - Add strategy search and filtering capabilities
  - _Requirements: Strategy management system_

- [x] 14. Build strategy management frontend components

  - Create StrategyForm component for strategy creation and editing
  - Build StrategyList component with filtering and search
  - Implement BucketManager for creating and organizing strategy buckets
  - Create TagManager for tag creation and assignment
  - Build StrategyAnalytics component for performance metrics
  - Add drag-and-drop functionality for strategy organization
  - _Requirements: Strategy management system_

- [x] 15. Create dashboard and navigation system

  - Build Dashboard component with navigation links and user statistics
  - Create NavMenu component with consistent navigation across pages
  - Implement StatsDisplay showing row count, upload count, and last activity
  - Add responsive navigation for mobile devices
  - Create breadcrumb navigation for deep pages
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 16. Implement comprehensive error handling

  - Add global error boundary for React application
  - Create consistent error response format for API endpoints
  - Implement retry mechanisms for network failures
  - Build user-friendly error messages for all failure scenarios
  - Add error logging and monitoring capabilities
  - Create fallback UI states for component failures
  - _Requirements: 7.4_

- [x] 17. Add performance optimizations

  - Implement code splitting for lazy loading of chart and calculation components
  - Add bundle optimization with tree shaking and minification
  - Create database indexing for frequently queried columns
  - Implement query optimization for pagination and filtering
  - Add browser caching strategies for static assets
  - Write memory management for large file processing
  - _Requirements: 7.1, 7.2, 7.3, 7.6_

- [x] 18. Create comprehensive test suite

  - Write unit tests for all backend services using Jest ✅ (9 service test files completed)
  - Create component tests for React components using React Testing Library ✅ (FormulaBuilder test completed)
  - Implement integration tests for API endpoints using Supertest ✅ (3 route test files completed)
  - Build end-to-end tests for critical user flows
  - Add performance tests for large dataset handling
  - Create manual testing checklist for deployment validation
  - _Requirements: 7.4, 7.5_

- [x] 19. Configure production deployment

  - Set up Vercel deployment configuration for frontend
  - Configure Render deployment for backend with environment variables
  - Implement production database initialization and migration scripts
  - Set up Gmail SMTP configuration for production email delivery
  - Configure CORS policies and security headers for production
  - Add production monitoring and health check endpoints
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 20. Final integration and testing

  - Integrate all components into cohesive application flow
  - Perform end-to-end testing with real CSV files and user scenarios
  - Validate performance requirements with 1000-row datasets
  - Test deployment pipeline and production environment
  - Conduct security review of authentication and data handling
  - Create user documentation and deployment guide
  - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_
