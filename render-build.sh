#!/bin/bash

# Render deployment script for Sharp module installation
echo "🔧 Installing Sharp for Linux-x64 architecture..."

# Install Sharp with specific platform and architecture
npm install --platform=linux --arch=x64 sharp

# Install Canvas for PDF processing
npm install --platform=linux --arch=x64 canvas

echo "✅ Sharp and Canvas installation complete!"

# Install other dependencies
npm install

echo "🚀 All dependencies installed successfully!"
