#!/bin/bash

# Urjeans Backend Deployment Script for aHost.uz
# This script helps automate the deployment process

echo "🚀 Starting Urjeans Backend Deployment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please create one based on .env.example"
    echo "   Make sure to set all required environment variables."
    exit 1
fi

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    echo "📁 Creating logs directory..."
    mkdir logs
fi

# Create uploads directory if it doesn't exist
if [ ! -d "uploads" ]; then
    echo "📁 Creating uploads directory..."
    mkdir uploads
    chmod 755 uploads
    echo "✅ Uploads directory created with proper permissions"
fi

# Clean existing node_modules and package-lock.json for fresh install
echo "🧹 Cleaning existing dependencies..."
rm -rf node_modules package-lock.json

# Install dependencies with production flag
echo "📦 Installing dependencies..."
npm install --production

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Rebuild sharp for Linux platform
echo "🔧 Rebuilding sharp module for Linux..."
npm rebuild sharp --platform=linux --arch=x64

if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Failed to rebuild sharp module. Trying alternative approach..."
    npm install --os=linux --cpu=x64 sharp
fi

# Verify critical dependencies
echo "🔍 Verifying critical dependencies..."
if [ ! -d "node_modules/express" ]; then
    echo "❌ Express module not found. Reinstalling..."
    npm install express
fi

if [ ! -d "node_modules/bcryptjs" ]; then
    echo "❌ Bcryptjs module not found. Reinstalling..."
    npm install bcryptjs
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
fi

# Stop existing PM2 process if running
echo "🛑 Stopping existing PM2 processes..."
pm2 stop urjeans-backend 2>/dev/null || true
pm2 delete urjeans-backend 2>/dev/null || true

# Start the application with PM2
echo "▶️  Starting application with PM2..."
pm2 start ecosystem.config.js --env production

if [ $? -eq 0 ]; then
    echo "✅ Application started successfully!"
    
    # Save PM2 configuration
    echo "💾 Saving PM2 configuration..."
    pm2 save
    
    # Show PM2 status
    echo "📊 PM2 Status:"
    pm2 status
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "📝 To view logs: pm2 logs urjeans-backend"
    echo "🔄 To restart: pm2 restart urjeans-backend"
    echo "🛑 To stop: pm2 stop urjeans-backend"
else
    echo "❌ Failed to start application"
    echo "📋 Checking application logs..."
    pm2 logs urjeans-backend --lines 20
    exit 1
fi 