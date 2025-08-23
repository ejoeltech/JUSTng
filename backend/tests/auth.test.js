import request from 'supertest'
import { createServer } from 'http'
import { Server } from 'socket.io'
import express from 'express'
import dotenv from 'dotenv'
import authRoutes from '../routes/auth.js'

// Load test environment variables
dotenv.config({ path: '.env.test' })

const app = express()
app.use(express.json())
app.use('/api/auth', authRoutes)

const server = createServer(app)
const io = new Server(server)

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        phone: '+2348012345678',
        fullName: 'Test User'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body).toHaveProperty('message', 'User registered successfully')
      expect(response.body).toHaveProperty('user')
      expect(response.body).toHaveProperty('token')
      expect(response.body.user.email).toBe(userData.email)
    })

    it('should return 400 for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        phone: '+2348012345678',
        fullName: 'Test User'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body).toHaveProperty('error', 'Validation Error')
    })

    it('should return 400 for short password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        phone: '+2348012345678',
        fullName: 'Test User'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body).toHaveProperty('error', 'Validation Error')
    })
  })

  describe('POST /api/auth/login', () => {
    it('should return 400 for missing email', async () => {
      const loginData = {
        password: 'password123'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400)

      expect(response.body).toHaveProperty('error', 'Validation Error')
    })

    it('should return 400 for missing password', async () => {
      const loginData = {
        email: 'test@example.com'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400)

      expect(response.body).toHaveProperty('error', 'Validation Error')
    })
  })

  describe('POST /api/auth/reset-password', () => {
    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({})
        .expect(400)

      expect(response.body).toHaveProperty('error', 'Missing Email')
    })
  })
})

// Cleanup
afterAll(() => {
  server.close()
})
