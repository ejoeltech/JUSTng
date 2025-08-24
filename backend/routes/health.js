import express from 'express'
import { dbHelpers } from '../config/supabase.js'

const router = express.Router()

// Health check endpoint for load balancers and monitoring
router.get('/', async (req, res) => {
  const startTime = Date.now()
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {}
  }

  try {
    // Database connectivity check
    try {
      const { data, error } = await dbHelpers.query('SELECT 1 as health_check')
      if (error) throw error
      health.checks.database = {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: 'Database connection successful'
      }
    } catch (dbError) {
      health.checks.database = {
        status: 'unhealthy',
        error: dbError.message,
        details: 'Database connection failed'
      }
      health.status = 'degraded'
    }

    // Memory usage check
    const memUsage = process.memoryUsage()
    health.checks.memory = {
      status: 'healthy',
      details: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
      }
    }

    // CPU usage check
    const cpuUsage = process.cpuUsage()
    health.checks.cpu = {
      status: 'healthy',
      details: {
        user: `${Math.round(cpuUsage.user / 1000)} ms`,
        system: `${Math.round(cpuUsage.system / 1000)} ms`
      }
    }

    // Environment variables check
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET',
      'CORS_ORIGIN'
    ]
    
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])
    health.checks.environment = {
      status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
      details: missingEnvVars.length === 0 ? 'All required environment variables are set' : `Missing: ${missingEnvVars.join(', ')}`
    }

    if (missingEnvVars.length > 0) {
      health.status = 'unhealthy'
    }

    // Overall response time
    health.responseTime = Date.now() - startTime

    // Set appropriate HTTP status code
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503

    res.status(statusCode).json(health)

  } catch (error) {
    health.status = 'unhealthy'
    health.error = error.message
    health.responseTime = Date.now() - startTime
    
    res.status(503).json(health)
  }
})

// Detailed health check for monitoring systems
router.get('/detailed', async (req, res) => {
  const startTime = Date.now()
  const detailedHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    pid: process.pid,
    checks: {},
    metrics: {}
  }

  try {
    // Database detailed check
    try {
      const dbStartTime = Date.now()
      const { data, error } = await dbHelpers.query('SELECT 1 as health_check')
      const dbResponseTime = Date.now() - dbStartTime
      
      if (error) throw error
      
      detailedHealth.checks.database = {
        status: 'healthy',
        responseTime: dbResponseTime,
        details: 'Database connection successful',
        connectionPool: 'active'
      }
    } catch (dbError) {
      detailedHealth.checks.database = {
        status: 'unhealthy',
        error: dbError.message,
        details: 'Database connection failed',
        connectionPool: 'inactive'
      }
      detailedHealth.status = 'degraded'
    }

    // Memory detailed metrics
    const memUsage = process.memoryUsage()
    detailedHealth.metrics.memory = {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers
    }

    // CPU detailed metrics
    const cpuUsage = process.cpuUsage()
    detailedHealth.metrics.cpu = {
      user: cpuUsage.user,
      system: cpuUsage.system
    }

    // System information
    detailedHealth.metrics.system = {
      loadAverage: (await import('os')).default.loadavg(),
      totalMemory: (await import('os')).default.totalmem(),
      freeMemory: (await import('os')).default.freemem(),
      cpus: (await import('os')).default.cpus().length
    }

    // Environment variables detailed check
    const envVars = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      JWT_SECRET: !!process.env.JWT_SECRET,
      CORS_ORIGIN: !!process.env.CORS_ORIGIN,
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT
    }
    
    detailedHealth.checks.environment = {
      status: Object.values(envVars).every(Boolean) ? 'healthy' : 'unhealthy',
      details: envVars
    }

    // Process metrics
    detailedHealth.metrics.process = {
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: memUsage,
      cpuUsage: cpuUsage
    }

    // Overall response time
    detailedHealth.responseTime = Date.now() - startTime

    // Set appropriate HTTP status code
    const statusCode = detailedHealth.status === 'healthy' ? 200 : 
                      detailedHealth.status === 'degraded' ? 200 : 503

    res.status(statusCode).json(detailedHealth)

  } catch (error) {
    detailedHealth.status = 'unhealthy'
    detailedHealth.error = error.message
    detailedHealth.responseTime = Date.now() - startTime
    
    res.status(503).json(detailedHealth)
  }
})

// Readiness probe for Kubernetes
router.get('/ready', async (req, res) => {
  try {
    // Check if the application is ready to receive traffic
    const { data, error } = await dbHelpers.query('SELECT 1 as ready_check')
    
    if (error) {
      return res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database connection failed'
      })
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      details: 'Application is ready to receive traffic'
    })
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      reason: error.message
    })
  }
})

// Liveness probe for Kubernetes
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid
  })
})

export default router
