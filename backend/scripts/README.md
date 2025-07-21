# TradeInsight Database Scripts

This directory contains utility scripts for managing the TradeInsight database.

## Verify Demo User Script

This script creates or updates the demo user account and ensures it's verified in the database.

### Usage

1. Install dependencies:
   ```
   npm install
   ```

2. Run the script:
   ```
   npm run verify-demo
   ```

### What it does

- Creates a demo user if it doesn't exist
- Ensures the demo user's email is marked as verified
- Updates the demo user's password to the standard demo password
- Works with both local and production databases

### Configuration

The script uses these default values:
- Email: demo@tradeinsight.com
- Password: Demo123!

### Running on Render.com

To run this script on Render.com:

1. SSH into your Render shell
2. Navigate to the scripts directory:
   ```
   cd /opt/render/project/src/backend/scripts
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Run the script:
   ```
   DATABASE_PATH=/opt/render/project/src/backend/data/tradeinsight.db node verify-demo-user.js
   ```