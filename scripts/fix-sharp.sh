#!/bin/bash

# Fix Sharp Module for Linux Deployment
# This script specifically addresses sharp module compatibility issues

echo "🔧 Fixing Sharp Module for Linux Deployment..."

# Check if we're on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "⚠️  This script is designed for Linux deployment"
fi

# Remove existing sharp installation
echo "🧹 Removing existing sharp installation..."
npm uninstall sharp

# Clear npm cache
echo "🗑️  Clearing npm cache..."
npm cache clean --force

# Install sharp with platform-specific flags
echo "📦 Installing sharp for Linux x64..."
npm install --platform=linux --arch=x64 sharp

# Alternative installation method if the above fails
if [ $? -ne 0 ]; then
    echo "🔄 Trying alternative installation method..."
    npm install --os=linux --cpu=x64 sharp
fi

# Verify installation
if [ -d "node_modules/sharp" ]; then
    echo "✅ Sharp module installed successfully!"
    
    # Test sharp functionality
    echo "🧪 Testing sharp module..."
    node -e "
    try {
        const sharp = require('sharp');
        console.log('Sharp version:', sharp.versions.sharp);
        console.log('✅ Sharp module is working correctly');
    } catch (error) {
        console.error('❌ Sharp module test failed:', error.message);
        process.exit(1);
    }
    "
else
    echo "❌ Sharp module installation failed"
    exit 1
fi

echo "🎉 Sharp module fix completed!" 