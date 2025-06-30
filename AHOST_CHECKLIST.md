# aHost Deployment Checklist

## Pre-Deployment Checklist

### ✅ Repository Preparation
- [ ] All code is committed and pushed to Git
- [ ] `package.json` contains all required dependencies
- [ ] `server.js` is the main entry point
- [ ] No sensitive data in repository (use environment variables)

### ✅ Environment Variables (Set in aHost)
- [ ] `DB_HOST` - Database host address
- [ ] `DB_USER` - Database username
- [ ] `DB_PASSWORD` - Database password
- [ ] `DB_NAME` - Database name
- [ ] `DB_PORT` - Database port (usually 3306)
- [ ] `JWT_SECRET` - Secure JWT secret key
- [ ] `NODE_ENV` - Set to "production"
- [ ] `PORT` - Leave empty (aHost manages this)
- [ ] `FRONTEND_URL` - Your frontend domain (optional)

### ✅ aHost Configuration
- [ ] Node.js version: 18.x or higher
- [ ] Entry point: `server.js`
- [ ] Repository URL: Correct Git repository
- [ ] Branch: `main` (or your default branch)

## Deployment Steps

### 1. Create Node.js App in aHost
1. Login to aHost control panel
2. Navigate to Node.js Apps
3. Click "Set up Node app"
4. Fill in the configuration:
   - App Name: `urjeans-backend`
   - Node.js Version: `18.x`
   - Entry Point: `server.js`
   - Repository: Your Git URL
   - Branch: `main`

### 2. Set Environment Variables
1. In your Node.js app settings
2. Add all required environment variables
3. Save the configuration

### 3. Deploy
1. Click "Deploy" button
2. Wait for build process to complete
3. Check deployment logs for errors

## Post-Deployment Verification

### ✅ Health Check
```bash
curl https://your-domain.com/health
```

### ✅ API Test
```bash
curl https://your-domain.com/
```

### ✅ Database Connection
Check logs in aHost control panel for:
- "Database connection successful"
- No database connection errors

## Common Issues & Solutions

### ❌ Sharp Module Error
**Solution:** The `postinstall` script should handle this automatically.

### ❌ Express Module Not Found
**Solution:** Verify `package.json` has express in dependencies.

### ❌ Database Connection Failed
**Solution:** Verify environment variables are set correctly.

## Success Indicators

✅ App responds to health check  
✅ API endpoints are accessible  
✅ Database connections work  
✅ No errors in aHost logs  
✅ Sharp module loads successfully 