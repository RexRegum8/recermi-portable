console.log('[BACKEND] Starting initialization...')
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import http from 'http'
import { Server } from 'socket.io'
import cookieParser from 'cookie-parser'
import { prisma } from './db.js'
console.log('[BACKEND] Imports successful')

import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import salesRoutes from './routes/sales.js'
import ticketRoutes from './routes/tickets.js'
import configRoutes from './routes/config.js'
import customerRoutes from './routes/customers.js'
import sessionsRoutes from './routes/sessions.js'
import quotationRoutes from './routes/quotations.js'
import loyaltyRoutes from './routes/loyalty.js'
import setupRoutes from './routes/setup.js'

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*', // In production, restrict this to your frontend URL
    methods: ['GET', 'POST']
  }
})
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: true, // Allow all origins for now in dev
  credentials: true
}))
app.use(cookieParser())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Request logger
app.use((req, res, next) => {
  console.log(`[BACKEND] ${req.method} ${req.url}`)
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/config', configRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/sessions', sessionsRoutes)
app.use('/api/quotations', quotationRoutes)
app.use('/api/loyalty', loyaltyRoutes)
app.use('/api/setup', setupRoutes)

// Serve Catalog (Static Files)
const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html')) 
  ? path.join(process.cwd(), 'dist')
  : path.join(process.cwd(), '..', 'dist');

console.log(`[BACKEND] Serving static files from: ${distPath}`);
app.use(express.static(distPath))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Rexermi Backend is running' })
})

// SPA Catch-all
app.get('*', (req, res) => {
  // Only handle GET requests for non-API routes
  if (req.method === 'GET' && !req.url.startsWith('/api')) {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  res.status(404).send('Not Found');
})

// basic error handling
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal Server Error' })
})

// Socket connection
io.on('connection', (socket) => {
  console.log(`[SOCKET] User connected: ${socket.id}`)
  socket.on('disconnect', () => {
    console.log(`[SOCKET] User disconnected: ${socket.id}`)
  })
})

// Attach io to app for use in routes
app.set('io', io)

console.log(`[BACKEND] Attempting to listen on port ${PORT}...`)
server.listen(PORT, () => {
  console.log(`🚀 Server & Sockets ready at: http://localhost:${PORT}`)
})

export { prisma }
