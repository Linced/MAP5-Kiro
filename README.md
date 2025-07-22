# TradeInsight MVP

A web-based trading data analysis tool that allows users to upload CSV files, view and manipulate data in tables, perform calculations, and create visualizations.

## Deployment

The application is deployed at:
- Frontend: [Vercel](https://map-5-kira-6c62opehl-linceds-projects.vercel.app)
- Backend: [Render](https://map5-kiro-backend.onrender.com)

## Project Structure

```
trade-insight-mvp/
├── frontend/          # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API service layer
│   │   ├── utils/         # Utility functions
│   │   ├── types/         # TypeScript definitions
│   │   └── hooks/         # Custom React hooks
│   └── package.json
├── backend/           # Node.js + Express + TypeScript backend
│   ├── src/
│   │   ├── services/      # Business logic services
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript definitions
│   └── package.json
└── package.json       # Root package.json for monorepo
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

### Development

Start both frontend and backend in development mode:
```bash
npm run dev
```

Or start them individually:
```bash
# Frontend (http://localhost:3000)
npm run dev:frontend

# Backend (http://localhost:3001)
npm run dev:backend
```

### Building

Build both frontend and backend:
```bash
npm run build
```

### Testing

Run tests for both frontend and backend:
```bash
npm test
```

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- TanStack Table for data tables
- Chart.js for visualizations
- Tailwind CSS for styling
- React Router for navigation

### Backend
- Node.js with Express
- TypeScript
- SQLite for database
- JWT for authentication
- Multer for file uploads
- Math.js for formula calculations

## Features

- User authentication and account management
- CSV file upload and processing
- Interactive data tables with sorting and filtering
- Basic calculation engine for derived metrics
- Data visualization with charts
- Cost-effective deployment on free hosting tiers