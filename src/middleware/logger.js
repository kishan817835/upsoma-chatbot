class Logger {
  constructor() {
    this.requestLogs = [];
    this.maxLogs = 1000; // Keep last 1000 logs in memory
  }

  logRequest(req, startTime, queueWaitTime = 0, batchSize = 1) {
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    const totalTime = processingTime + queueWaitTime;

    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      processingTime: processingTime,
      queueWaitTime: queueWaitTime,
      totalTime: totalTime,
      batchSize: batchSize,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: this.getClientIP(req)
    };

    // Add to memory logs
    this.requestLogs.push(logEntry);
    if (this.requestLogs.length > this.maxLogs) {
      this.requestLogs.shift();
    }

    // Console output
    console.log(`📝 [${logEntry.timestamp}] ${req.method} ${req.url}`);
    console.log(`⏱️  Processing: ${processingTime}ms | Queue: ${queueWaitTime}ms | Total: ${totalTime}ms | Batch: ${batchSize}`);
    console.log(`🌐 IP: ${logEntry.ip} | UA: ${logEntry.userAgent.substring(0, 50)}...`);
    console.log('---');

    return logEntry;
  }

  logError(error, req = null) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      method: req?.method || 'unknown',
      url: req?.url || 'unknown',
      ip: req ? this.getClientIP(req) : 'unknown'
    };

    // Add to memory logs
    this.requestLogs.push(errorLog);
    if (this.requestLogs.length > this.maxLogs) {
      this.requestLogs.shift();
    }

    // Console output
    console.error(`❌ [${errorLog.timestamp}] ERROR: ${errorLog.error}`);
    if (req) {
      console.error(`   Request: ${errorLog.method} ${errorLog.url} from ${errorLog.ip}`);
    }
    console.error(`   Stack: ${errorLog.stack}`);
    console.error('---');

    return errorLog;
  }

  getClientIP(req) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    const cfConnectingIP = req.headers['cf-connecting-ip'];
    
    if (forwardedFor) return forwardedFor;
    if (realIP) return realIP;
    if (cfConnectingIP) return cfConnectingIP;
    return 'unknown';
  }

  getStats() {
    if (this.requestLogs.length === 0) {
      return {
        totalRequests: 0,
        avgProcessingTime: 0,
        avgQueueTime: 0,
        avgTotalTime: 0,
        avgBatchSize: 1
      };
    }

    const recentLogs = this.requestLogs.slice(-100); // Last 100 requests
    const totalRequests = recentLogs.length;
    const avgProcessingTime = recentLogs.reduce((sum, log) => sum + log.processingTime, 0) / totalRequests;
    const avgQueueTime = recentLogs.reduce((sum, log) => sum + log.queueWaitTime, 0) / totalRequests;
    const avgTotalTime = recentLogs.reduce((sum, log) => sum + log.totalTime, 0) / totalRequests;
    const avgBatchSize = recentLogs.reduce((sum, log) => sum + log.batchSize, 0) / totalRequests;

    return {
      totalRequests,
      avgProcessingTime: Math.round(avgProcessingTime),
      avgQueueTime: Math.round(avgQueueTime),
      avgTotalTime: Math.round(avgTotalTime),
      avgBatchSize: Math.round(avgBatchSize * 10) / 10
    };
  }

  getRecentLogs(count = 50) {
    return this.requestLogs.slice(-count);
  }

  middleware() {
    return async (c, next) => {
      const startTime = Date.now();
      
      try {
        await next();
        
        const processingTime = Date.now() - startTime;
        console.log(`📤 [${new Date().toISOString()}] ${c.req.method} ${c.req.url} - ${c.res.status} (${processingTime}ms)`);
        
      } catch (error) {
        this.logError(error, c.req);
        throw error;
      }
    };
  }
}

module.exports = { Logger };
