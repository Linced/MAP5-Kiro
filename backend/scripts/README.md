# TradeInsight Backend Scripts

This directory contains utility scripts for the TradeInsight backend.

## Verify Demo User Script

This script creates or updates the demo user account and sets its email verification status to true.

### Prerequisites

- Node.js installed
- Access to the TradeInsight database

### Installation

```bash
npm install
```

### Usage

```bash
npm run verify-demo
```

### What it does

1. Connects to the TradeInsight database
2. Checks if the demo user (demo@tradeinsight.com) exists
3. If the user doesn't exist, creates a new demo user with email verification set to true
4. If the user exists, updates the user to set email verification to true

### Demo Account Credentials

- Email: demo@tradeinsight.com
- Password: Demo123!

## Running on Render.com

To run this script on Render.com:

1. SSH into your Render.com instance
2. Navigate to the scripts directory: `cd /opt/render/project/src/backend/scripts`
3. Install dependencies: `npm install`
4. Run the script: `npm run verify-demo`

This will ensure the demo account is properly set up and verified in the database.