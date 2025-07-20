# 25MB File Upload Deployment Verification Guide

## Issue Summary
The application was showing "Maximum file size: 10MB" instead of "25MB" due to:
1. **Mock API Service**: Application was using `mockApiService` instead of real API
2. **Wrong Endpoint**: Upload endpoint was `/api/upload` instead of `/api/upload/csv`
3. **Environment Config**: Production had `MAX_FILE_SIZE=10485760` (10MB) instead of 25MB

## Fixes Applied ✅

### 1. Frontend Fixes
- ✅ **API Service**: Switched from `mockApiService` to `realApiService` in `frontend/src/services/api.ts`
- ✅ **Upload Endpoint**: Changed from `/api/upload` to `/api/upload/csv`
- ✅ **Clean Rebuild**: Removed old `dist/` and rebuilt with `npm run build`

### 2. Backend Fixes
- ✅ **Environment**: Updated `backend/.env.production` from 10MB to 25MB (26214400 bytes)
- ✅ **Logging**: Added debug logging to upload middleware to verify configuration
- ✅ **Clean Rebuild**: Removed old `dist/` and rebuilt with `npm run build`

## Deployment Checklist

### Frontend Deployment
- [ ] **Clear Browser Cache**: Hard refresh (Ctrl+F5) or clear browser cache
- [ ] **Verify Build**: Check that `frontend/dist/` contains new build files
- [ ] **Deploy to Hosting**: 
  - If using Vercel: `vercel deploy` or push to main branch
  - If using Netlify: Upload new `dist/` folder or trigger new build
  - If using custom server: Upload new `dist/` files

### Backend Deployment
- [ ] **Environment Variables**: Ensure production environment loads `.env.production`
- [ ] **Server Restart**: Kill and restart the Node.js process
- [ ] **Verify Build**: Check that `backend/dist/` contains new compiled files
- [ ] **Check Logs**: Look for the debug message: "Upload middleware configured with MAX_FILE_SIZE: 26214400 bytes (25MB)"

### Verification Steps

#### 1. Check UI Display
- [ ] Navigate to upload page
- [ ] Verify it shows "Maximum file size: 25MB" (not 10MB)
- [ ] Verify upload area shows correct text

#### 2. Test File Size Validation
- [ ] Try uploading a file > 25MB → Should show "File size must be less than 25MB"
- [ ] Try uploading a file < 25MB → Should proceed with upload
- [ ] Try uploading exactly 25MB file → Should work or show appropriate boundary behavior

#### 3. Check Network Requests
- [ ] Open browser DevTools → Network tab
- [ ] Attempt file upload
- [ ] Verify request goes to `/api/upload/csv` (not `/api/upload`)
- [ ] Check for errors: 413 (Payload Too Large), 404 (Not Found), 500 (Server Error)

#### 4. Check Server Logs
- [ ] Look for upload middleware debug message on server startup
- [ ] Check for any errors during file upload attempts
- [ ] Verify authentication is working (no 401 errors)

## Common Issues & Solutions

### Issue: Still showing 10MB limit
**Solution**: Clear browser cache completely or try incognito/private browsing mode

### Issue: Upload fails with 404 error
**Solution**: Verify backend server is running and `/api/upload/csv` endpoint is available

### Issue: Upload fails with 413 Payload Too Large
**Solution**: Check if there's a reverse proxy (Nginx, Apache) with its own file size limits

### Issue: Upload fails with authentication error
**Solution**: Verify user is logged in and JWT token is valid

## Environment-Specific Notes

### Development Environment
- Frontend: `http://localhost:5173` (Vite dev server)
- Backend: `http://localhost:3001` (Express server)
- Use `npm run dev` for both frontend and backend

### Production Environment
- Frontend: Deployed to hosting platform (Vercel, Netlify, etc.)
- Backend: Deployed to server with production environment variables
- Ensure CORS is configured for production frontend URL

## Testing Commands

### Test Backend Endpoint Directly
```bash
# Test with curl (replace with your backend URL)
curl -X POST http://localhost:3001/api/upload/csv \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test.csv"
```

### Test File Size Limits
```bash
# Create test files of different sizes
dd if=/dev/zero of=test_1mb.csv bs=1M count=1
dd if=/dev/zero of=test_25mb.csv bs=1M count=25
dd if=/dev/zero of=test_30mb.csv bs=1M count=30
```

## Success Criteria ✅

The deployment is successful when:
1. ✅ UI shows "Maximum file size: 25MB"
2. ✅ Files up to 25MB upload successfully
3. ✅ Files over 25MB are rejected with appropriate error message
4. ✅ Network requests go to `/api/upload/csv` endpoint
5. ✅ Server logs show "Upload middleware configured with MAX_FILE_SIZE: 26214400 bytes (25MB)"
6. ✅ No console errors in browser DevTools

## Rollback Plan

If issues persist:
1. **Revert API Service**: Change back to `mockApiService` temporarily
2. **Check Environment**: Verify all environment variables are correct
3. **Restart Services**: Full restart of both frontend and backend
4. **Check Dependencies**: Ensure all npm packages are installed correctly

## Contact Information

If deployment issues persist, check:
- Server logs for detailed error messages
- Browser DevTools Console and Network tabs
- Environment variable configuration
- Hosting platform deployment logs