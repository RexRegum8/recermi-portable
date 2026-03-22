import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()

// List all tickets
router.get('/', async (req, res) => {
  try {
    const tickets = await prisma.serviceTicket.findMany({
      include: { notes: true },
      orderBy: { date: 'desc' }
    })
    res.json(tickets)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener tickets' })
  }
})

// Create ticket
router.post('/', async (req, res) => {
  const { customer, phone, device, serial, issue, author } = req.body
  try {
    const ticket = await prisma.$transaction(async (tx) => {
      // Generate collision-safe TK number
      const lastTicket = await tx.serviceTicket.findFirst({
        orderBy: { tkNumber: 'desc' }
      })
      let nextNum = 1
      if (lastTicket && lastTicket.tkNumber?.startsWith('TK-')) {
        const parts = lastTicket.tkNumber.split('-')
        nextNum = parseInt(parts[1]) + 1
      }
      const tkNumber = `TK-${nextNum.toString().padStart(3, '0')}`

      return await tx.serviceTicket.create({
        data: {
          tkNumber,
          customer, phone, device, serial, issue,
          status: 'ENTRY',
          notes: {
            create: { content: `[Sistema] Creado por ${author}`, author }
          }
        },
        include: { notes: true }
      })
    })
    res.status(201).json(ticket)
  } catch (e) {
    console.error(e)
    res.status(400).json({ error: 'Error al crear ticket' })
  }
})

// Update ticket (Now supports warrantyDays and parts JSON)
router.patch('/:id', async (req, res) => {
  const { status, diagnosis, cost, warranty, warrantyDays, parts } = req.body
  try {
    const ticket = await prisma.serviceTicket.update({
      where: { id: req.params.id },
      data: { status, diagnosis, cost, warranty, warrantyDays: warrantyDays || 0, parts },
      include: { notes: true }
    })
    res.json(ticket)
  } catch (e) {
    res.status(400).json({ error: 'Error al actualizar ticket' })
  }
})

// Close ticket (Create Sale & award loyalty points)
router.post('/:id/close', async (req, res) => {
  const { id } = req.params
  const { paymentMethod, paymentRef, customerId } = req.body
  try {
    const ticket = await prisma.$transaction(async (tx) => {
      const t = await tx.serviceTicket.findUnique({ where: { id } })
      if (!t) throw new Error('Ticket no encontrado')
      if (t.status !== 'DELIVERED') throw new Error('El equipo debe estar en estado ENTREGADO para cobrar')

      const config = await tx.systemConfig.findFirst() || { ivaPercent: 16, exchangeRateBCV: 36.5, fidelityEnabled: false, ptsPer10Usd: 1 }
      const activeSession = await tx.cashSession.findFirst({ where: { status: 'OPEN' }, orderBy: { openedAt: 'desc' } })
      if (!activeSession) throw new Error('No hay sesión de caja abierta')

      const subtotal = t.cost / (1 + (config.ivaPercent / 100))
      const iva = t.cost - subtotal
      const now = new Date()

      // Ensure a generic "Service" product exists for the sale link
      let serviceProd = await tx.product.findUnique({ where: { sku: 'SERVICE' } })
      if (!serviceProd) {
        serviceProd = await tx.product.create({
          data: {
            sku: 'SERVICE',
            name: 'Servicio Técnico',
            category: 'Servicio',
            price: 0,
            cost: 0,
            stock: 999999,
            showInCatalog: false
          }
        })
      }

      // Create Sale
      const sale = await tx.sale.create({
        data: {
          saleNumber: `SRV-${t.tkNumber}`,
          subtotal,
          globalDiscount: 0,
          iva,
          total: t.cost,
          totalBs: t.cost * config.exchangeRateBCV,
          paymentMethod: paymentMethod || 'Servicio Técnico',
          paymentRef,
          cashier: 'Sistema (Servicio)',
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          sessionId: activeSession.id,
          customerId: customerId || null,
          items: {
             create: {
               productId: serviceProd.id,
               qty: 1,
               price: t.cost,
               warrantyDays: t.warrantyDays || 0
             }
          }
        }
      })

      // Loyalty Pts
      if (config.fidelityEnabled && customerId) {
        const pts = Math.floor(t.cost / 10) * config.ptsPer10Usd
        if (pts > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: { points: { increment: pts } }
          })
        }
      }

      // Update ticket
      return await tx.serviceTicket.update({
        where: { id },
        data: { diagnosis: (t.diagnosis || '') + '\n[PAGADO]' }
      })
    })
    res.json(ticket)
  } catch (e) {
    console.error(e)
    res.status(400).json({ error: e.message || 'Error al cerrar ticket' })
  }
})

export default router
