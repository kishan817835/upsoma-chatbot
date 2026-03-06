// Simple in-memory rate limiter middleware
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute window
    this.maxRequests = options.maxRequests || 100; // Max requests per window
    this.clients = new Map();
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  middleware() {
    return async (c, next) => {
      const clientIP = c.req.header('x-forwarded-for') || 
                      c.req.header('x-real-ip') || 
                      'unknown';
      
      const now = Date.now();
      const client = this.clients.get(clientIP);
      
      if (!client) {
        // New client
        this.clients.set(clientIP, {
          requests: 1,
          resetTime: now + this.windowMs
        });
        return await next();
      }
      
      // Check if window has expired
      if (now > client.resetTime) {
        client.requests = 1;
        client.resetTime = now + this.windowMs;
        return await next();
      }
      
      // Check if limit exceeded
      if (client.requests >= this.maxRequests) {
        const resetIn = Math.ceil((client.resetTime - now) / 1000);
        return c.json({
          error: {
            message: `Too many requests. Try again in ${resetIn} seconds.`,
            type: 'rate_limit_exceeded',
            retry_after: resetIn
          }
        }, 429);
      }
      
      // Increment request count
      client.requests++;
      
      return await next();
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, client] of this.clients.entries()) {
      if (now > client.resetTime) {
        this.clients.delete(ip);
      }
    }
  }

  // Get current stats
  getStats() {
    return {
      totalClients: this.clients.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests
    };
  }
}

module.exports = { RateLimiter };
