# TradeInsight MVP - Production Deployment Guide

This guide covers deploying TradeInsight MVP to production using Vercel (frontend) and Render (backend).

## Prerequisites

1. **Gmail Account with App Password**
   - Enable 2-factor authentication on your Gmail account
   - Generate an App Password for SMTP access
   - Note: Regular Gmail password won't work for SMTP

2. **Vercel Account** (free tier)
   - Sign up at [vercel.com](https://vercel.com)
   - Connect your GitHub repository

3. **Render Account** (free tier)
   - Sign up at [render.com](https://render.com)
   - Connect your GitHub repository

## Backend Deployment (Render)

### 1. Environment Variables Setup

In your Render dashboard, set these environment variables:

```bash
NODE_ENV=production
PORT=10000
DATABASE_PATH=/opt/render/project/src/data/tradeinsight.db
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters
JWT_EXPIRES_IN=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### 2. Render Service Configuration

Create a new Web Service in Render with these settings:

- **Build Command**: `cd backend && npm install && npm run build`
- **Start Command**: `cd backend && npm start`
- **Environment**: Node
- **Plan**: Free
- **Health Check Path**: `/health`

### 3. Persistent Disk (Optional)

For data persistence across deployments:
- Add a disk named `data`
- Mount path: `/opt/render/project/src/data`
- Size: 1GB (free tier limit)

## Frontend Deployment (Vercel)

### 1. Environment Variables Setup

In your Vercel dashboard, set these environment variables:

```bash
VITE_API_URL=https://your-backend-domain.onrender.com
VITE_APP_NAME=TradeInsight
VITE_APP_VERSION=1.0.0
```

### 2. Vercel Configuration

The `vercel.json` file is already configured with:
- Static build optimization
- API proxy to backend
- Caching headers for performance
- Environment variable injection

### 3. Build Settings

Vercel will automatically detect the build settings from `package.json`:
- **Build Command**: `npm run vercel-build`
- **Output Directory**: `frontend/dist`
- **Install Command**: `npm install`

## Database Setup

The database will be automatically initialized on first startup using SQLite. The production startup script handles:

1. Creating necessary directories
2. Initializing database schema
3. Running migrations
4. Verifying email service configuration

## Email Configuration

### Gmail SMTP Setup

1. **Enable 2-Factor Authentication**
   - Go to Google Account settings
   - Security → 2-Step Verification → Turn on

2. **Generate App Password**
   - Security → 2-Step Verification → App passwords
   - Select app: Mail
   - Select device: Other (custom name)
   - Copy the generated 16-character password

3. **Use App Password**
   - Set `SMTP_USER` to your Gmail address
   - Set `SMTP_PASS` to the generated app password (not your regular password)

## Security Considerations

### Production Security Features

1. **CORS Configuration**
   - Restricts origins to allowed domains
   - Configurable via environment variables

2. **Security Headers**
   - Helmet.js with CSP policies
   - HSTS headers for HTTPS enforcement
   - XSS protection

3. **Rate Limiting**
   - Built-in rate limiting for API endpoints
   - Configurable limits and windows

4. **Input Validation**
   - Joi schema validation for all inputs
   - File upload restrictions and validation

### Environment Variables Security

- Never commit `.env` files to version control
- Use strong, unique JWT secrets (minimum 32 characters)
- Rotate secrets regularly
- Use environment-specific configurations

## Monitoring and Health Checks

### Health Check Endpoints

- **`/health`**: Comprehensive health check including database and email service status
- **`/ready`**: Readiness probe for container orchestration
- **`/api/performance`**: Performance metrics and monitoring data

### Monitoring Setup

The application includes built-in monitoring for:
- Request/response times
- Memory usage
- Database query performance
- Error rates and types
- Email delivery status

## Deployment Process

### Automatic Deployment

Both services are configured for automatic deployment:

1. **Push to main branch**
2. **Vercel automatically deploys frontend**
3. **Render automatically deploys backend**
4. **Database migrations run automatically**

### Manual Deployment

If needed, you can trigger manual deployments:

1. **Vercel**: Use the dashboard or CLI
2. **Render**: Use the dashboard or API

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check `DATABASE_PATH` environment variable
   - Ensure disk is properly mounted (Render)
   - Check file permissions

2. **Email Service Errors**
   - Verify Gmail app password is correct
   - Check SMTP environment variables
   - Ensure 2FA is enabled on Gmail account

3. **CORS Errors**
   - Verify `FRONTEND_URL` matches your Vercel domain
   - Check CORS configuration in backend

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are listed in package.json
   - Check build logs for specific errors

### Debugging

1. **Check Health Endpoints**
   ```bash
   curl https://your-backend.onrender.com/health
   curl https://your-backend.onrender.com/ready
   ```

2. **Monitor Logs**
   - Render: View logs in dashboard
   - Vercel: View function logs in dashboard

3. **Performance Monitoring**
   ```bash
   curl https://your-backend.onrender.com/api/performance
   ```

## Cost Optimization

### Free Tier Limits

**Vercel Free Tier:**
- 100GB bandwidth per month
- Unlimited static deployments
- 100 serverless function executions per day

**Render Free Tier:**
- 750 hours per month (enough for 24/7 operation)
- 512MB RAM
- Sleeps after 15 minutes of inactivity

### Optimization Tips

1. **Frontend Optimization**
   - Code splitting is already configured
   - Static assets are cached with long TTL
   - Bundle size is optimized with tree shaking

2. **Backend Optimization**
   - Database queries are optimized with indexes
   - Response caching for GET requests
   - Memory management for large file processing

3. **Database Optimization**
   - SQLite is lightweight and efficient
   - Automatic cleanup of old data
   - Optimized schema with proper indexes

## Backup and Recovery

### Database Backup

Since SQLite is file-based:
1. **Render Persistent Disk**: Data persists across deployments
2. **Manual Backup**: Download database file via Render shell access
3. **Automated Backup**: Consider implementing periodic backups to cloud storage

### Recovery Process

1. **Database Recovery**: Restore from backup file
2. **Configuration Recovery**: Restore environment variables
3. **Code Recovery**: Deploy from Git repository

## Support and Maintenance

### Regular Maintenance

1. **Monitor Resource Usage**
   - Check Render dashboard for memory/CPU usage
   - Monitor Vercel bandwidth usage

2. **Update Dependencies**
   - Regular security updates
   - Monitor for vulnerabilities

3. **Database Maintenance**
   - Monitor database size
   - Clean up old data periodically

### Getting Help

- Check application logs first
- Use health check endpoints for diagnostics
- Review this deployment guide
- Check service provider documentation (Vercel/Render)

## Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Gmail SMTP working (test email verification)
- [ ] Health checks passing
- [ ] CORS configured correctly
- [ ] SSL/HTTPS enabled
- [ ] Database initialized and accessible
- [ ] File uploads working
- [ ] Authentication flow tested
- [ ] Performance monitoring active
- [ ] Backup strategy in place

## Next Steps

After successful deployment:

1. **Monitor Performance**: Use built-in monitoring endpoints
2. **User Testing**: Test all features in production environment
3. **Documentation**: Update any user-facing documentation
4. **Scaling**: Monitor usage and plan for scaling if needed
5. **Security**: Regular security audits and updates