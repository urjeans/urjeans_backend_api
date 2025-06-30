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

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
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
    exit 1
fi 