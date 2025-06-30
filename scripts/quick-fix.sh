#!/bin/bash

# Quick Fix Script for Urjeans Backend Deployment Issues
# This script addresses the most common deployment problems

echo "🚀 Quick Fix for Urjeans Backend Deployment Issues..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# 1. Fix Sharp Module
echo "🔧 Step 1: Fixing Sharp Module..."
if [ -d "node_modules/sharp" ]; then
    echo "   Removing existing sharp installation..."
    npm uninstall sharp
fi

echo "   Installing sharp for Linux..."
npm install --platform=linux --arch=x64 sharp

if [ $? -ne 0 ]; then
    echo "   Trying alternative method..."
    npm install --os=linux --cpu=x64 sharp
fi

# 2. Ensure Critical Dependencies
echo "📦 Step 2: Ensuring Critical Dependencies..."
CRITICAL_DEPS=("express" "bcryptjs" "cors" "dotenv" "jsonwebtoken" "mysql2")

for dep in "${CRITICAL_DEPS[@]}"; do
    if [ ! -d "node_modules/$dep" ]; then
        echo "   Installing missing dependency: $dep"
        npm install "$dep"
    fi
done

# 3. Check Environment File
echo "🔍 Step 3: Checking Environment Configuration..."
if [ ! -f ".env" ]; then
    echo "   ⚠️  .env file not found. Please create one based on .env.example"
    if [ -f ".env.example" ]; then
        echo "   Copying .env.example to .env..."
        cp .env.example .env
        echo "   ⚠️  Please edit .env file with your actual configuration"
    fi
else
    echo "   ✅ .env file exists"
fi

# 4. Create Required Directories
echo "📁 Step 4: Creating Required Directories..."
mkdir -p logs uploads
chmod 755 uploads

# 5. Test Database Connection
echo "🗄️  Step 5: Testing Database Connection..."
if [ -f ".env" ]; then
    node -e "
    require('dotenv').config();
    const mysql = require('mysql2');
    
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    
    pool.query('SELECT 1 as test', (err, results) => {
        if (err) {
            console.error('❌ Database connection failed:', err.message);
            process.exit(1);
        }
        console.log('✅ Database connection successful');
        process.exit(0);
    });
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Database connection test passed"
    else
        echo "   ❌ Database connection test failed"
        echo "   Please check your .env file and database configuration"
    fi
else
    echo "   ⚠️  Skipping database test (no .env file)"
fi

# 6. Test Sharp Module
echo "🧪 Step 6: Testing Sharp Module..."
node -e "
try {
    const sharp = require('sharp');
    console.log('✅ Sharp module is working correctly');
    console.log('   Version:', sharp.versions.sharp);
} catch (error) {
    console.error('❌ Sharp module test failed:', error.message);
    process.exit(1);
}
" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "   ✅ Sharp module test passed"
else
    echo "   ❌ Sharp module test failed"
fi

# 7. Restart PM2 if running
if command_exists pm2; then
    echo "🔄 Step 7: Restarting PM2 Process..."
    pm2 stop urjeans-backend 2>/dev/null || true
    pm2 delete urjeans-backend 2>/dev/null || true
    
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js --env production
        if [ $? -eq 0 ]; then
            echo "   ✅ PM2 process started successfully"
            pm2 save
        else
            echo "   ❌ Failed to start PM2 process"
        fi
    else
        echo "   ⚠️  ecosystem.config.js not found, skipping PM2 restart"
    fi
else
    echo "   ⚠️  PM2 not installed, skipping PM2 restart"
fi

echo ""
echo "🎉 Quick fix completed!"
echo ""
echo "📋 Next steps:"
echo "1. If database test failed, check your .env file"
echo "2. If sharp test failed, run: ./scripts/fix-sharp.sh"
echo "3. Check logs: pm2 logs urjeans-backend"
echo "4. Test your API endpoints" 