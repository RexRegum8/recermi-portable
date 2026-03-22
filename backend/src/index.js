import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { prisma } from './db.js'
// import { PrismaClient } from '@prisma/client' // removed

import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import salesRoutes from './routes/sales.js'
import ticketRoutes from './routes/tickets.js'
import configRoutes from './routes/config.js'
import customerRoutes from './routes/customers.js'
import sessionsRoutes from './routes/sessions.js'
import quotationRoutes from './routes/quotations.js'
import loyaltyRoutes from './routes/loyalty.js'

dotenv.config()

const app = express()
// const prisma = new PrismaClient() // removed
const PORT = process.env.PORT || 3001

app.use(cors())
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

// Serve Catalog (Static Files)
app.use(express.static(path.join(process.cwd(), 'dist')))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Rexermi Backend is running' })
})

// basic error handling
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, () => {
  console.log(`🚀 Server ready at: http://localhost:${PORT}`)
})

export { prisma }
