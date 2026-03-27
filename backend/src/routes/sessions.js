import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()

// Get active session
router.get('/active', async (req, res) => {
  console.log('[SESSIONS] Fetching active cash session...')
  try {
    const session = await prisma.cashSession.findFirst({
      where: { status: 'OPEN' },
      orderBy: { openedAt: 'desc' }
    })
    console.log(`[SESSIONS] Active session: ${session ? session.id : 'None'}`)
    res.json(session)
  } catch (e) {
    console.error(`[SESSIONS] Error fetching active session: ${e.message}`)
    res.status(500).json({ error: 'Error al obtener sesión activa' })
  }
})

// Get active session sales
router.get('/active/sales', async (req, res) => {
  console.log('[SESSIONS] Fetching sales for active session...')
  try {
    const active = await prisma.cashSession.findFirst({
      where: { status: 'OPEN' },
      orderBy: { openedAt: 'desc' }
    })
    if (!active) {
      console.log('[SESSIONS] No active session found')
      return res.json([])
    }
    
    const sales = await prisma.sale.findMany({
      where: { sessionId: active.id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    })
    console.log(`[SESSIONS] Successfully fetched ${sales.length} sales for session ${active.id}`)
    res.json(sales)
  } catch (e) {
    console.error(`[SESSIONS] Error fetching active session sales: ${e.message}`)
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
  console.log(`[SESSIONS] Opening new cash session (Balance: ${openingBalance}, Cashier: ${cashier})`)
  try {
    // Close any previous open session first (safety)
    await prisma.cashSession.updateMany({
      where: { status: 'OPEN' },
      data: { status: 'CLOSED', closedAt: new Date() }
    })

    const session = await prisma.cashSession.create({
      data: { openingBalance, cashier, status: 'OPEN' }
    })
    console.log(`[SESSIONS] Session opened successfully: ${session.id}`)
    res.status(201).json(session)
  } catch (e) {
    console.error(`[SESSIONS] Error opening session: ${e.message}`)
    res.status(400).json({ error: 'Error al abrir caja' })
  }
})

// Close session
router.post('/close', async (req, res) => {
  const { id, closingBalance } = req.body
  console.log(`[SESSIONS] Closing cash session ID: ${id} (Final Balance: ${closingBalance})`)
  try {
    const session = await prisma.cashSession.update({
      where: { id },
      data: { 
        closingBalance, 
        status: 'CLOSED', 
        closedAt: new Date() 
      }
    })
    console.log(`[SESSIONS] Session ${id} closed successfully`)
    res.json(session)
  } catch (e) {
    console.error(`[SESSIONS] Error closing session ${id}: ${e.message}`)
    res.status(400).json({ error: 'Error al cerrar caja' })
  }
})

export default router
