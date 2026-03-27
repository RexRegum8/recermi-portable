import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()

// List all tickets
router.get('/', async (req, res) => {
  console.log('[TICKETS] Fetching all tickets...')
  try {
    const tickets = await prisma.serviceTicket.findMany({
      include: { notes: true },
      orderBy: { date: 'desc' }
    })
    console.log(`[TICKETS] Successfully fetched ${tickets.length} tickets`)
    res.json(tickets)
  } catch (e) {
    console.error(`[TICKETS] Error fetching tickets: ${e.message}`)
    res.status(500).json({ error: 'Error al obtener tickets' })
  }
})

// Create ticket
router.post('/', async (req, res) => {
  const { customer, phone, device, serial, issue, author } = req.body
  console.log(`[TICKETS] Creating ticket for customer: ${customer} (Device: ${device})`)
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
    console.log(`[TICKETS] Ticket created successfully: ${ticket.tkNumber}`)
    res.status(201).json(ticket)
  } catch (e) {
    console.error(`[TICKETS] Error creating ticket: ${e.message}`)
    res.status(400).json({ error: 'Error al crear ticket' })
  }
})

// Add part to ticket with stock management
router.post('/:id/parts', async (req, res) => {
  const { id } = req.params
  const { productId, qty } = req.body
  console.log(`[TICKETS] Adding part ${productId} (qty: ${qty}) to ticket ${id}`)
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) throw new Error('Producto no encontrado')
      if (product.stock < qty && product.sku !== 'SERVICE') throw new Error('Stock insuficiente')
      
      const t = await tx.serviceTicket.findUnique({ where: { id } })
      if (!t) throw new Error('Ticket no encontrado')
      
      // Update Stock (if not a generic service item)
      if (product.sku !== 'SERVICE') {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { decrement: qty } }
        })
        
        // Record Movement
        await tx.stockMovement.create({
          data: {
            productId,
            quantity: -qty,
            type: 'OUT',
            reason: `Uso en Ticket ${t.tkNumber}`,
            user: 'Sistema (Servicio)'
          }
        })
      }
      
      // Update Ticket Parts list
      let parts = []
      try { parts = JSON.parse(t.parts || '[]') } catch(e) { parts = [] }
      parts.push({ 
        productId, 
        name: product.name, 
        sku: product.sku, 
        qty, 
        price: product.price,
        addedAt: new Date().toISOString()
      })
      
      return await tx.serviceTicket.update({
        where: { id },
        data: { parts: JSON.stringify(parts) },
        include: { notes: true }
      })
    })
    
    res.json(result)
  } catch (e) {
    console.error(`[TICKETS] Error adding part: ${e.message}`)
    res.status(400).json({ error: e.message })
  }
})

// Remove part from ticket and restore stock
router.delete('/:id/parts/:index', async (req, res) => {
  const { id, index } = req.params
  console.log(`[TICKETS] Removing part at index ${index} from ticket ${id}`)
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      const t = await tx.serviceTicket.findUnique({ where: { id } })
      if (!t) throw new Error('Ticket no encontrado')
      
      let parts = []
      try { parts = JSON.parse(t.parts || '[]') } catch(e) { parts = [] }
      const partIdx = parseInt(index)
      const partToRemove = parts[partIdx]
      
      if (!partToRemove) throw new Error('Parte no encontrada en el ticket')
      
      // Restore Stock if it has a productId and is not generic service
      if (partToRemove.productId) {
        const prod = await tx.product.findUnique({ where: { id: partToRemove.productId } })
        if (prod && prod.sku !== 'SERVICE') {
          await tx.product.update({
            where: { id: partToRemove.productId },
            data: { stock: { increment: partToRemove.qty } }
          })
          
          await tx.stockMovement.create({
            data: {
              productId: partToRemove.productId,
              quantity: partToRemove.qty,
              type: 'IN',
              reason: `Devolución (Anulación en TK ${t.tkNumber})`,
              user: 'Sistema (Servicio)'
            }
          })
        }
      }
      
      // Remove from list
      parts.splice(partIdx, 1)
      
      return await tx.serviceTicket.update({
        where: { id },
        data: { parts: JSON.stringify(parts) },
        include: { notes: true }
      })
    })
    
    res.json(result)
  } catch (e) {
    console.error(`[TICKETS] Error removing part: ${e.message}`)
    res.status(400).json({ error: e.message })
  }
})

// Update ticket
router.patch('/:id', async (req, res) => {
  const { status, diagnosis, cost, warranty, warrantyDays, parts } = req.body
  console.log(`[TICKETS] Updating ticket ID: ${req.params.id} (Status: ${status})`)
  try {
    const ticket = await prisma.serviceTicket.update({
      where: { id: req.params.id },
      data: { status, diagnosis, cost, warranty, warrantyDays: warrantyDays || 0, parts },
      include: { notes: true }
    })
    console.log(`[TICKETS] Ticket ${req.params.id} updated successfully`)
    res.json(ticket)
  } catch (e) {
    console.error(`[TICKETS] Error updating ticket ${req.params.id}: ${e.message}`)
    res.status(400).json({ error: 'Error al actualizar ticket' })
  }
})

// Close ticket (Create Sale & award loyalty points)
router.post('/:id/close', async (req, res) => {
  const { id } = req.params
  const { paymentMethod, paymentRef, customerId } = req.body
  console.log(`[TICKETS] Closing and billing ticket ID: ${id}`)
  try {
    const ticket = await prisma.$transaction(async (tx) => {
      const t = await tx.serviceTicket.findUnique({ where: { id } })
      if (!t) throw new Error('Ticket no encontrado')
      if (t.status !== 'DELIVERED') {
        console.warn(`[TICKETS] Close failed: Ticket ${id} status is ${t.status}, must be DELIVERED`)
        throw new Error('El equipo debe estar en estado ENTREGADO para cobrar')
      }

      const config = await tx.systemConfig.findFirst() || { ivaPercent: 16, exchangeRateBCV: 36.5, fidelityEnabled: false, ptsPer10Usd: 1 }
      const activeSession = await tx.cashSession.findFirst({ where: { status: 'OPEN' }, orderBy: { openedAt: 'desc' } })
      if (!activeSession) {
        console.warn('[TICKETS] Close failed: No open cash session')
        throw new Error('No hay sesión de caja abierta')
      }

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
    console.log(`[TICKETS] Ticket ${id} closed and billed successfully as SRV-${ticket.tkNumber}`)
    res.json(ticket)
  } catch (e) {
    console.error(`[TICKETS] Error closing ticket ${id}: ${e.message}`)
    res.status(400).json({ error: e.message || 'Error al cerrar ticket' })
  }
})

export default router
