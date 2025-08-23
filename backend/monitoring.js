const winston = require('winston')
const { createLogger, format, transports } = winston
const { combine, timestamp, label, printf, colorize } = format

// Custom format for logs
const logFormat = printf(({ level, message, label, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${label}] ${level}: ${message}`
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`
  }
  return msg
})

// Create logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    label({ label: 'JUST-BACKEND' }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console transport for development
    new transports.Console({
      format: combine(
        colorize(),
        logFormat
      )
    }),
    
    // File transport for production logs
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
})

// Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTimes: [],
      startTime: Date.now()
    }
  }

  // Record request metrics
  recordRequest(responseTime) {
    this.metrics.requests++
    this.metrics.responseTimes.push(responseTime)
    
    // Keep only last 1000 response times
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes.shift()
    }
  }

  // Record error
  recordError() {
    this.metrics.errors++
  }

  // Get performance statistics
  getStats() {
    const responseTimes = this.metrics.responseTimes
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0
    
    const sortedTimes = [...responseTimes].sort((a, b) => a - b)
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)]
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)]

    return {
      totalRequests: this.metrics.requests,
      totalErrors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) : 0,
      averageResponseTime: avgResponseTime.toFixed(2),
      p95ResponseTime: p95 || 0,
      p99ResponseTime: p99 || 0,
      uptime: Date.now() - this.metrics.startTime
    }
  }

  // Reset metrics
  reset() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTimes: [],
      startTime: Date.now()
    }
  }
}

// Create performance monitor instance
const performanceMonitor = new PerformanceMonitor()

// Memory monitoring
class MemoryMonitor {
  constructor() {
    this.initialMemory = process.memoryUsage()
  }

  getMemoryStats() {
    const currentMemory = process.memoryUsage()
    const initialMemory = this.initialMemory

    return {
      current: {
        rss: this.formatBytes(currentMemory.rss),
        heapTotal: this.formatBytes(currentMemory.heapTotal),
        heapUsed: this.formatBytes(currentMemory.heapUsed),
        external: this.formatBytes(currentMemory.external)
      },
      initial: {
        rss: this.formatBytes(initialMemory.rss),
        heapTotal: this.formatBytes(initialMemory.heapTotal),
        heapUsed: this.formatBytes(initialMemory.heapUsed),
        external: this.formatBytes(initialMemory.external)
      },
      difference: {
        rss: this.formatBytes(currentMemory.rss - initialMemory.rss),
        heapTotal: this.formatBytes(currentMemory.heapTotal - initialMemory.heapTotal),
        heapUsed: this.formatBytes(currentMemory.heapUsed - initialMemory.heapUsed),
        external: this.formatBytes(currentMemory.external - initialMemory.external)
      }
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Create memory monitor instance
const memoryMonitor = new MemoryMonitor()

// Database monitoring
class DatabaseMonitor {
  constructor() {
    this.queries = []
    this.slowQueries = []
    this.maxQueryTime = 1000 // 1 second
  }

  // Record query execution
  recordQuery(sql, duration, success = true) {
    const query = {
      sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
      duration,
      success,
      timestamp: new Date().toISOString()
    }

    this.queries.push(query)
    
    // Keep only last 1000 queries
    if (this.queries.length > 1000) {
      this.queries.shift()
    }

    // Record slow queries
    if (duration > this.maxQueryTime) {
      this.slowQueries.push(query)
      
      // Keep only last 100 slow queries
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift()
      }
    }
  }

  // Get database statistics
  getStats() {
    const totalQueries = this.queries.length
    const failedQueries = this.queries.filter(q => !q.success).length
    const slowQueriesCount = this.slowQueries.length

    const avgDuration = this.queries.length > 0
      ? this.queries.reduce((sum, q) => sum + q.duration, 0) / this.queries.length
      : 0

    return {
      totalQueries,
      failedQueries,
      successRate: totalQueries > 0 ? ((totalQueries - failedQueries) / totalQueries * 100).toFixed(2) : 100,
      averageQueryTime: avgDuration.toFixed(2),
      slowQueries: slowQueriesCount,
      recentQueries: this.queries.slice(-10)
    }
  }

  // Reset database metrics
  reset() {
    this.queries = []
    this.slowQueries = []
  }
}

// Create database monitor instance
const databaseMonitor = new DatabaseMonitor()

// Export monitoring utilities
module.exports = {
  logger,
  performanceMonitor,
  memoryMonitor,
  databaseMonitor,
  
  // Convenience methods
  log: (level, message, meta = {}) => logger.log(level, message, meta),
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta)
}
