# 🌐 Domain Configuration Guide

## 📋 Environment Detection

### **🔧 Automatic Domain Setup:**

#### **Local Development:**
- ✅ **localhost**: `http://localhost:3000`
- ✅ **127.0.0.1**: `http://localhost:3000`
- ✅ **192.168.x.x**: `http://localhost:3000`
- ✅ **10.0.x.x**: `http://localhost:3000`

#### **Production:**
- ✅ **Live Domain**: `https://your-api-domain.com`

## 🚀 Client Integration Options

### **Option 1: Automatic Detection**
```html
<script>
    (function() {
        const isLocalhost = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1' || 
                          window.location.hostname.includes('192.168.') ||
                          window.location.hostname.includes('10.0.');
        
        window.AI_CHAT_CONFIG = {
            apiUrl: isLocalhost ? 'http://localhost:3000' : 'https://your-api-domain.com',
            position: 'bottom-right',
            theme: 'blue'
        };
    })();
</script>
<script src="ai-chat-complete.js"></script>
```

### **Option 2: Manual Configuration**
```html
<!-- For Local Development -->
<script>
    window.AI_CHAT_CONFIG = {
        apiUrl: 'http://localhost:3000',
        position: 'bottom-right',
        theme: 'blue'
    };
</script>
<script src="ai-chat-complete.js"></script>

<!-- For Production -->
<script>
    window.AI_CHAT_CONFIG = {
        apiUrl: 'https://your-api-domain.com',
        position: 'bottom-right',
        theme: 'blue'
    };
</script>
<script src="ai-chat-complete.js"></script>
```

### **Option 3: Environment Variable**
```html
<script>
    window.AI_CHAT_CONFIG = {
        apiUrl: window.location.hostname === 'localhost' 
                ? 'http://localhost:3000' 
                : 'https://your-api-domain.com',
        position: 'bottom-right',
        theme: 'blue'
    };
</script>
<script src="ai-chat-complete.js"></script>
```

## 🎯 Client Setup Steps

### **Step 1: Update API Domain**
```javascript
// Client needs to change this line:
apiUrl: 'https://your-api-domain.com'  // <-- Replace with actual API URL
```

### **Step 2: Choose Configuration Method**
- ✅ **Automatic**: Best for most clients
- ✅ **Manual**: For specific requirements
- ✅ **Environment**: For development/production separation

### **Step 3: Test Integration**
```bash
# Local testing
# Open: http://localhost/your-website

# Production testing
# Open: https://your-client-website.com
```

## 📱 Framework Integration

### **React Example:**
```jsx
useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost';
    
    window.AI_CHAT_CONFIG = {
        apiUrl: isLocalhost ? 'http://localhost:3000' : 'https://your-api-domain.com'
    };
    
    const script = document.createElement('script');
    script.src = 'ai-chat-complete.js';
    document.body.appendChild(script);
}, []);
```

### **Angular Example:**
```typescript
ngAfterViewInit() {
    const isLocalhost = window.location.hostname === 'localhost';
    
    window.AI_CHAT_CONFIG = {
        apiUrl: isLocalhost ? 'http://localhost:3000' : 'https://your-api-domain.com'
    };
    
    const script = document.createElement('script');
    script.src = 'ai-chat-complete.js';
    document.body.appendChild(script);
}
```

## 🔍 Debug Information

### **Console Logs:**
```javascript
console.log('AI Chat Widget Configuration:', {
    environment: isLocalhost ? 'LOCAL' : 'PRODUCTION',
    apiUrl: apiUrl,
    hostname: window.location.hostname
});
```

### **Common Issues:**
- ❌ **CORS Error**: Check API domain
- ❌ **Network Error**: Verify server is running
- ❌ **404 Error**: Check script path

## 🚀 Deployment Checklist

### **For Clients:**
- ✅ **Update API URL**: Replace with actual domain
- ✅ **Test Local**: Verify localhost works
- ✅ **Test Production**: Verify live domain works
- ✅ **Check Console**: Look for configuration logs

### **For Development:**
- ✅ **Local Server**: Running on port 3000
- ✅ **CORS Enabled**: Allow client domains
- ✅ **SSL Certificate**: For production HTTPS
- ✅ **Domain Verified**: API domain accessible

## 📋 Final Integration Code

### **Production Ready:**
```html
<script>
    (function() {
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || 
                          hostname === '127.0.0.1' || 
                          hostname.includes('192.168.') ||
                          hostname.includes('10.0.');
        
        window.AI_CHAT_CONFIG = {
            apiUrl: isLocalhost 
                    ? 'http://localhost:3000' 
                    : 'https://your-actual-api-domain.com',  // <-- CHANGE THIS
            position: 'bottom-right',
            theme: 'blue',
            title: 'AI Assistant'
        };
    })();
</script>
<script src="https://your-cdn-domain.com/ai-chat-complete.js"></script>
```

Ye setup automatically detect karega ki local development hai ya production aur accordingly API URL set karega! 🎯
