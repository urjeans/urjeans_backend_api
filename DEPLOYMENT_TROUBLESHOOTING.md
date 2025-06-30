# Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. Sharp Module Error
**Error:** `Could not load the "sharp" module using the linux-x64 runtime`

**Solution:**
```bash
# Run the dedicated fix script
./scripts/fix-sharp.sh

# Or manually:
npm uninstall sharp
npm cache clean --force
npm install --platform=linux --arch=x64 sharp
```

### 2. Express Module Not Found
**Error:** `Cannot find module 'express'`

**Solution:**
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install --production

# Verify critical modules
npm install express bcryptjs cors dotenv
```

### 3. Bcryptjs Error
**Error:** `Illegal arguments: string, undefined`

**Solution:**
- The code has been updated to validate password fields before comparison
- Ensure your database has proper password_hash values for all users
- Check that the login request includes both username and password

### 4. Database Connection Issues
**Error:** Database connection failures

**Solution:**
```bash
# Check database configuration
cat .env | grep DB_

# Test database connection
node -e "
const { pool } = require('./config/database');
pool.query('SELECT 1', (err, results) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Database connection successful');
    process.exit(0);
});
"
```

## Deployment Steps

### 1. Pre-deployment Checklist
- [ ] `.env` file exists with all required variables
- [ ] Database is accessible from deployment server
- [ ] Node.js version >= 18.0.0
- [ ] npm version >= 8.0.0

### 2. Fresh Deployment
```bash
# Run the deployment script
./deploy.sh

# Or manually:
rm -rf node_modules package-lock.json
npm install --production
npm rebuild sharp --platform=linux --arch=x64
pm2 start ecosystem.config.js --env production
```

### 3. Update Existing Deployment
```bash
# Pull latest changes
git pull origin main

# Run deployment script
./deploy.sh
```

## Environment Variables

Ensure your `.env` file contains:
```env
# Database
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
DB_PORT=3306

# JWT
JWT_SECRET=your_jwt_secret_key

# Server
PORT=3000
NODE_ENV=production

# Optional: Cloudinary (if using image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## PM2 Commands

```bash
# View logs
pm2 logs urjeans-backend

# Restart application
pm2 restart urjeans-backend

# Stop application
pm2 stop urjeans-backend

# View status
pm2 status

# Monitor resources
pm2 monit
```

## Testing the API

After deployment, test your endpoints:
```bash
# Health check
curl http://your-domain.com/api/health

# Login test
curl -X POST http://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

## Common Debugging Commands

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check PM2 version
pm2 --version

# View system resources
free -h
df -h

# Check application logs
tail -f logs/combined.log
```

## Support

If issues persist:
1. Check the logs: `pm2 logs urjeans-backend`
2. Verify environment variables
3. Test database connectivity
4. Ensure all dependencies are properly installed 