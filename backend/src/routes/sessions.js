import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()

// Get active session
router.get('/active', async (req, res) => {
  try {
    const session = await prisma.cashSession.findFirst({
      where: { status: 'OPEN' },
      orderBy: { openedAt: 'desc' }
    })
    res.json(session)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener sesión activa' })
  }
})

// Get active session sales
router.get('/active/sales', async (req, res) => {
  try {
    const active = await prisma.cashSession.findFirst({
      where: { status: 'OPEN' },
      orderBy: { openedAt: 'desc' }
    })
    if (!active) return res.json([])
    
    const sales = await prisma.sale.findMany({
      where: { sessionId: active.id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(sales)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener ventas de sesión' })
  }
})

// Get session history
router.get('/history', async (req, res) => {
  try {
    const sessions = await prisma.cashSession.findMany({
      orderBy: { openedAt: 'desc' }
    })
    res.json(sessions)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener historial' })
  }
})

// Open session
router.post('/open', async (req, res) => {
  const { openingBalance, cashier } = req.body
  try {
    // Close any previous open session first (safety)
    await prisma.cashSession.updateMany({
      where: { status: 'OPEN' },
      data: { status: 'CLOSED', closedAt: new Date() }
    })

    const session = await prisma.cashSession.create({
      data: { openingBalance, cashier, status: 'OPEN' }
    })
    res.status(201).json(session)
  } catch (e) {
    res.status(400).json({ error: 'Error al abrir caja' })
  }
})

// Close session
router.post('/close', async (req, res) => {
  const { id, closingBalance } = req.body
  try {
    const session = await prisma.cashSession.update({
      where: { id },
      data: { 
        closingBalance, 
        status: 'CLOSED', 
        closedAt: new Date() 
      }
    })
    res.json(session)
  } catch (e) {
    res.status(400).json({ error: 'Error al cerrar caja' })
  }
})

export default router
