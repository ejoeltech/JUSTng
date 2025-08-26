import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'

// Import routes
import authRoutes from './routes/auth.js'
import incidentRoutes from './routes/incidents.js'
import userRoutes from './routes/users.js'
import adminRoutes from './routes/admin.js'
import superAdminRoutes from './routes/superAdmin.js'
import offlineQueueRoutes from './routes/offlineQueue.js'
import healthRoutes from './routes/health.js'

// Import middleware
import { authenticateToken } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

const PORT = process.env.PORT || 5000

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}))
app.use(compression())
app.use(morgan('combined'))
app.use(limiter)
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'JUST Backend API is running!',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      incidents: '/api/incidents',
      users: '/api/users',
      admin: '/api/admin',
      superAdmin: '/api/super-admin',
      offlineQueue: '/api/offline-queue'
    }
  })
})

// Health check routes
app.use('/health', healthRoutes)

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/incidents', authenticateToken, incidentRoutes)
app.use('/api/users', authenticateToken, userRoutes)
app.use('/api/admin', authenticateToken, adminRoutes)
app.use('/api/super-admin', authenticateToken, superAdminRoutes)
app.use('/api/offline-queue', offlineQueueRoutes)

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)
  
  // Join incident room for real-time updates
  socket.on('join-incident', (incidentId) => {
    socket.join(`incident-${incidentId}`)
    console.log(`User ${socket.id} joined incident ${incidentId}`)
  })
  
  // Handle live streaming
  socket.on('stream-data', (data) => {
    socket.to(`incident-${data.incidentId}`).emit('stream-update', data)
  })
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

// Error handling middleware
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  })
})

// Start server
server.listen(PORT, () => {
  console.log(`🚀 JUST API Server running on port ${PORT}`)
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/health`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('Process terminated')
  })
})

export { io }
