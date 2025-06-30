# aHost Node.js App Deployment Guide

## Overview
This guide is specifically for deploying the Urjeans backend on aHost's managed Node.js hosting platform.

## Prerequisites
- aHost account with Node.js hosting
- Git repository with your code
- Database (MySQL) accessible from aHost

## Step-by-Step Deployment

### 1. Prepare Your Repository

Ensure your repository contains:
- `package.json` with all dependencies
- `server.js` as the main entry point
- `.env` file with your configuration (or set environment variables in aHost)
- All source code files

### 2. Set Up Node.js App in aHost

1. **Login to aHost Control Panel**
2. **Navigate to Node.js Apps**
3. **Click "Set up Node app"**
4. **Configure the app:**
   - **App Name:** `urjeans-backend`
   - **Node.js Version:** `18.x` or higher
   - **Entry Point:** `server.js`
   - **Repository:** Your Git repository URL
   - **Branch:** `main` (or your default branch)

### 3. Environment Variables

In aHost's Node.js app settings, add these environment variables:

```env
# Database Configuration
DB_HOST=your_database_host
DB_USER=your_database_username
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_key

# Server Configuration
PORT=3000
NODE_ENV=production

# Optional: Cloudinary (if using image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Build Commands (if available)

If aHost allows custom build commands, use:
```bash
npm install --production
npm rebuild sharp --platform=linux --arch=x64
```

### 5. Deploy

1. **Click "Deploy" in aHost**
2. **Wait for the build process to complete**
3. **Check the deployment logs for any errors**

## Troubleshooting aHost-Specific Issues

### 1. Sharp Module Error
**Error:** `Could not load the "sharp" module using the linux-x64 runtime`

**Solutions:**
- The `postinstall` script in `package.json` should handle this automatically
- If it fails, try removing sharp from dependencies and adding it as optional:
  ```json
  "optionalDependencies": {
    "sharp": "^0.34.2"
  }
  ```

### 2. Express Module Not Found
**Error:** `Cannot find module 'express'`

**Solution:**
- Ensure `package.json` has all required dependencies
- Check that aHost is running `npm install --production`
- Verify the Node.js version is compatible

### 3. Database Connection Issues
**Error:** Database connection failures

**Solutions:**
- Verify database credentials in environment variables
- Ensure database is accessible from aHost's servers
- Check if database requires SSL connections

### 4. Port Configuration
**Issue:** App not accessible

**Solution:**
- aHost typically manages the port automatically
- Set `PORT` environment variable to the port aHost assigns
- Or let aHost handle port management automatically

## aHost-Specific Configuration

### 1. Update server.js for aHost

Make sure your `server.js` handles aHost's environment:

```javascript
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
    console.log(`Server is running on ${host}:${port}`);
});
```

### 2. Health Check Endpoint

Add a health check endpoint for aHost monitoring:

```javascript
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
```

## Monitoring and Logs

### 1. View Logs in aHost
- Navigate to your Node.js app in aHost control panel
- Click on "Logs" or "Console"
- Monitor for any errors during startup

### 2. Common Log Locations
- Application logs: aHost control panel
- Error logs: aHost control panel
- Access logs: aHost control panel

## Testing Your Deployment

### 1. Health Check
```bash
curl https://your-domain.com/health
```

### 2. API Test
```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

## aHost Best Practices

### 1. Environment Variables
- Never commit sensitive data to your repository
- Use aHost's environment variable feature
- Keep different configurations for development and production

### 2. Dependencies
- Use `--production` flag for npm install
- Keep `devDependencies` separate from `dependencies`
- Use specific versions for critical packages

### 3. Error Handling
- Implement proper error handling in your application
- Use try-catch blocks for database operations
- Log errors appropriately

### 4. Performance
- Use connection pooling for database connections
- Implement caching where appropriate
- Monitor memory usage

## Support

If you encounter issues with aHost deployment:

1. **Check aHost's documentation** for Node.js apps
2. **Review deployment logs** in aHost control panel
3. **Verify environment variables** are set correctly
4. **Test locally** with the same Node.js version
5. **Contact aHost support** for platform-specific issues

## Alternative Solutions

If sharp module continues to cause issues:

1. **Remove sharp dependency** if not critical
2. **Use alternative image processing** libraries
3. **Process images on the client side**
4. **Use external image processing services** (Cloudinary, etc.)

## Quick Fix Commands

If you have access to aHost's terminal or SSH:

```bash
# Rebuild sharp module
npm rebuild sharp --platform=linux --arch=x64

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install --production

# Check Node.js version
node --version

# Test sharp module
node -e "console.log(require('sharp').versions.sharp)"
``` 