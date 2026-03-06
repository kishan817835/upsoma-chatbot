# 🚀 Windsurf Chatbot - Production Deployment Guide

## 📋 Environment Variables Setup

### **🔐 .env Configuration**
Copy the `.env` file and update with your production values:

```bash
# Backend Configuration
PORT=3000
NODE_ENV=production

# Qdrant Vector Database Configuration
QDRANT_URL=https://your-qdrant-instance.qdrant.tech:6333
QDRANT_API_KEY=your-actual-api-key-here

# Model Configuration
MODEL_NAME=Xenova/all-MiniLM-L6-v2
MODEL_DIMENSIONS=384

# Security Configuration
API_RATE_LIMIT=100
CORS_ORIGINS=https://your-domain.com,https://another-domain.com

# Document Processing
CHUNK_SIZE=200
CHUNK_OVERLAP=50
```

## 🌐 Deployment Options

### **Option 1: Static Frontend + External Backend**

1. **Deploy Frontend:**
   ```bash
   # Deploy frontend to Netlify/Vercel/etc.
   cp -r frontend/* your-deployment-folder/
   ```

2. **Run Backend:**
   ```bash
   # On your server/VPS
   npm install
   npm start
   ```

3. **Configure Frontend:**
   - Update API URL in frontend to point to your backend
   - Test connection

### **Option 2: Serverless Functions**

1. **Convert to Netlify Functions:**
   - Convert backend routes to Netlify Functions
   - Deploy both frontend and functions together

2. **Environment Variables:**
   - Set in Netlify dashboard
   - Functions will have access to .env values

## 🔧 Production Commands

### **Start Backend:**
```bash
# With environment variables
npm start

# Or directly with node
node src/windsurf-server.js
```

### **Test Configuration:**
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test with environment
NODE_ENV=production node src/windsurf-server.js
```

## 📊 Monitoring

### **Health Check:**
- URL: `http://your-domain.com/health`
- Shows: Model status, DB connection, chunking config

### **API Endpoints:**
- Upload: `POST /upload`
- Text Upload: `POST /upload/text`
- Search: `POST /v1/search`
- Stats: `GET /v1/vector-stats`

## 🔒 Security Notes

1. **API Keys:** Never commit .env to version control
2. **CORS:** Configure only allowed origins
3. **Rate Limiting:** Set appropriate limits
4. **HTTPS:** Use HTTPS in production

## 🚀 Quick Deploy

```bash
# 1. Install dependencies
npm install dotenv

# 2. Set environment variables
cp .env.example .env
# Edit .env with your values

# 3. Start production server
NODE_ENV=production npm start
```

## 📱️ Frontend Configuration

Update frontend to use production API URL:

```javascript
const API_BASE = 'https://your-backend-domain.com';
```

## 🎯 Features Ready for Production

✅ **200-word chunks** with company/document names
✅ **Enhanced search** with grouped results
✅ **Required fields** for better data quality
✅ **Environment variables** for secure configuration
✅ **CORS enabled** for cross-origin requests
✅ **Health monitoring** for production tracking

---

**🎉 Your Windsurf Chatbot is Production-Ready!**
