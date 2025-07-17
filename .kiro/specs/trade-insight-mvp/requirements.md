# Requirements Document

## Introduction

TradeInsight is a web-based trading data analysis tool that allows users to upload CSV files containing trading data, view and manipulate that data in tables, perform calculations, and create visualizations. The MVP focuses on core functionality with a simple, cost-effective architecture using SQLite, Express.js, and React, deployable on free hosting tiers.

## Requirements

### Requirement 1: User Authentication and Account Management

**User Story:** As a trader, I want to create an account and securely log in, so that I can access my personal trading data and keep it separate from other users.

#### Acceptance Criteria

1. WHEN a user visits the registration page THEN the system SHALL provide email and password input fields
2. WHEN a user submits valid registration information THEN the system SHALL create an account and send email verification
3. WHEN a user clicks the email verification link THEN the system SHALL activate their account
4. WHEN a user enters valid login credentials THEN the system SHALL authenticate them with JWT tokens
5. WHEN a user accesses protected routes without authentication THEN the system SHALL redirect them to login
6. IF a user enters invalid credentials THEN the system SHALL display appropriate error messages

### Requirement 2: CSV Data Upload and Storage

**User Story:** As a trader, I want to upload CSV files containing my trading data, so that I can analyze and visualize my trading performance.

#### Acceptance Criteria

1. WHEN a user selects a CSV file for upload THEN the system SHALL validate it is under 10MB and has .csv extension
2. WHEN a user uploads a valid CSV file THEN the system SHALL parse it and store the data in the database
3. WHEN CSV parsing is complete THEN the system SHALL display the number of rows processed
4. IF a CSV file has invalid format THEN the system SHALL display clear error messages
5. WHEN data is stored THEN the system SHALL associate it with the authenticated user's account
6. WHEN upload processing occurs THEN the system SHALL handle it synchronously for files under 1000 rows

### Requirement 3: Data Viewing and Table Management

**User Story:** As a trader, I want to view my uploaded trading data in a sortable, filterable table, so that I can examine specific records and patterns.

#### Acceptance Criteria

1. WHEN a user accesses their data THEN the system SHALL display it in a paginated table with 100 rows per page
2. WHEN a user clicks column headers THEN the system SHALL sort the data by that column
3. WHEN a user uses column visibility controls THEN the system SHALL show/hide selected columns
4. WHEN a user navigates between pages THEN the system SHALL maintain sorting and filtering state
5. IF no data exists THEN the system SHALL display a message prompting to upload data
6. WHEN the table loads THEN the system SHALL display within 3 seconds for datasets under 1000 rows

### Requirement 4: Basic Calculation Engine

**User Story:** As a trader, I want to create calculated columns using simple formulas, so that I can derive new metrics from my existing data.

#### Acceptance Criteria

1. WHEN a user enters a formula THEN the system SHALL support basic arithmetic operations (+, -, *, /, parentheses)
2. WHEN a user references columns THEN the system SHALL accept column names in bracket notation like [Open] or [Volume]
3. WHEN a formula is valid THEN the system SHALL show a preview of the first 10 calculated values
4. WHEN a user saves a calculated column THEN the system SHALL store it and display it in the data table
5. IF a formula has errors THEN the system SHALL display specific error messages
6. WHEN calculations are performed THEN the system SHALL handle division by zero and invalid operations gracefully

### Requirement 5: Data Visualization

**User Story:** As a trader, I want to create line and bar charts from my data, so that I can visualize trends and patterns in my trading performance.

#### Acceptance Criteria

1. WHEN a user accesses the charts section THEN the system SHALL allow selection of X and Y axis columns
2. WHEN chart parameters are selected THEN the system SHALL generate line or bar charts using the data
3. WHEN charts are displayed THEN the system SHALL provide basic interactivity (zoom, hover tooltips)
4. WHEN a user switches chart types THEN the system SHALL update the visualization without page reload
5. IF insufficient data exists for charting THEN the system SHALL display appropriate messages
6. WHEN charts load THEN the system SHALL render within 5 seconds for datasets under 1000 rows

### Requirement 6: Dashboard and Navigation

**User Story:** As a trader, I want a central dashboard to navigate between different features, so that I can efficiently access upload, table, and chart functionality.

#### Acceptance Criteria

1. WHEN a user logs in THEN the system SHALL display a dashboard with navigation links
2. WHEN the dashboard loads THEN the system SHALL show basic statistics (row count, last upload date)
3. WHEN a user clicks navigation links THEN the system SHALL route to the appropriate sections
4. WHEN a user is on any page THEN the system SHALL provide consistent navigation back to dashboard
5. IF a user has no data THEN the dashboard SHALL prominently display upload options
6. WHEN navigation occurs THEN the system SHALL maintain user session state

### Requirement 7: System Performance and Reliability

**User Story:** As a trader, I want the application to perform reliably and load quickly, so that I can efficiently analyze my data without delays.

#### Acceptance Criteria

1. WHEN pages load THEN the system SHALL complete initial render within 3 seconds
2. WHEN the application handles data THEN the system SHALL support up to 1000 rows efficiently
3. WHEN users interact with features THEN the system SHALL respond within 2 seconds for standard operations
4. WHEN errors occur THEN the system SHALL display user-friendly error messages
5. WHEN the system is deployed THEN it SHALL maintain 99% uptime on free hosting tiers
6. WHEN multiple users access the system THEN it SHALL handle concurrent usage without degradation

### Requirement 8: Cost-Effective Deployment

**User Story:** As a developer, I want to deploy the application using free or low-cost services, so that the MVP can be validated without significant infrastructure investment.

#### Acceptance Criteria

1. WHEN the application is deployed THEN the system SHALL use SQLite for zero-cost database storage
2. WHEN frontend is deployed THEN it SHALL use Vercel free tier with 100GB bandwidth
3. WHEN backend is deployed THEN it SHALL use Render free tier with 750 hours/month
4. WHEN email services are needed THEN the system SHALL use Gmail SMTP for free email delivery
5. WHEN the total monthly cost is calculated THEN it SHALL remain under $10/month
6. WHEN deployment occurs THEN it SHALL be achievable through Git-based deployment without complex CI/CD