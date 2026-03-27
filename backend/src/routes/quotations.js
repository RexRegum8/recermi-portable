import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()

// List all quotations
router.get('/', async (req, res) => {
  console.log('[QUOTATIONS] Fetching all quotations...')
  try {
    const quotations = await prisma.quotation.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    })
    
    // Auto-update expired status
    const now = new Date()
    const updated = quotations.map(q => {
      if (q.status === 'PENDING' && q.validUntil && new Date(q.validUntil) < now) {
        return { ...q, status: 'EXPIRED' }
      }
      return q
    })
    
    console.log(`[QUOTATIONS] Successfully fetched ${quotations.length} quotations`)
    res.json(updated)
  } catch (e) {
    console.error(`[QUOTATIONS] Error fetching quotations: ${e.message}`)
    res.status(500).json({ error: 'Error al obtener presupuestos' })
  }
})

// Create quotation
router.post('/', async (req, res) => {
  const { customerName, customerEmail, customerPhone, items, subtotal, globalDiscount, iva, total, notes, validUntil } = req.body
  console.log(`[QUOTATIONS] Creating quotation for: ${customerName}`)
  try {
    const quotation = await prisma.$transaction(async (tx) => {
      const lastQ = await tx.quotation.findFirst({ orderBy: { number: 'desc' } })
      let nextNum = 1
      if (lastQ && lastQ.number.startsWith('P-')) {
        const parts = lastQ.number.split('-')
        nextNum = parseInt(parts[1]) + 1
      }
      const number = `P-${nextNum.toString().padStart(4, '0')}`

      return await tx.quotation.create({
        data: {
          number,
          customerName, customerEmail, customerPhone,
          subtotal, globalDiscount: globalDiscount || 0, iva, total,
          notes,
          validUntil: validUntil ? new Date(validUntil) : null,
          items: {
            create: items.map(it => ({
              productId: it.productId,
              qty: it.qty,
              price: it.price,
              discount: it.discount || 0
            }))
          }
        },
        include: { items: { include: { product: true } } }
      })
    })
    console.log(`[QUOTATIONS] Quotation created successfully: ${quotation.number}`)
    res.status(201).json(quotation)
  } catch (e) {
    console.error(`[QUOTATIONS] Error creating quotation: ${e.message}`)
    res.status(400).json({ error: 'Error al crear presupuesto' })
  }
})

// Update/Sync quotation (for expired or manual sync)
router.patch('/:id/sync', async (req, res) => {
  console.log(`[QUOTATIONS] Syncing prices for quotation ID: ${req.params.id}`)
  try {
    const q = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: true } } }
    })
    if (!q) {
      console.warn(`[QUOTATIONS] Sync failed: Quotation ${req.params.id} not found`)
      throw new Error('No encontrado')
    }

    // Recalculate based on current prices
    let newSubtotal = 0
    const updatedItems = q.items.map(it => {
      const currentPrice = it.product.price
      newSubtotal += currentPrice * it.qty
      return { id: it.id, currentPrice }
    })

    const config = await prisma.systemConfig.findFirst()
    const newIva = newSubtotal * ((config?.ivaPercent || 16) / 100)
    const newTotal = newSubtotal + newIva

    const updated = await prisma.$transaction(async (tx) => {
      // Update each item price
      for (const it of updatedItems) {
        await tx.quotationItem.update({
          where: { id: it.id },
          data: { price: it.currentPrice }
        })
      }
      // Update quotation totals and reset status to PENDING
      return await tx.quotation.update({
        where: { id: q.id },
        data: {
          subtotal: newSubtotal,
          iva: newIva,
          total: newTotal,
          status: 'PENDING',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 days
        },
        include: { items: { include: { product: true } } }
      })
    })
    console.log(`[QUOTATIONS] Quotation ${q.number} synced successfully`)
    res.json(updated)
  } catch (e) {
    console.error(`[QUOTATIONS] Error syncing quotation ${req.params.id}: ${e.message}`)
    res.status(400).json({ error: e.message })
  }
})

// Convert quotation to sale
router.post('/:id/convert', async (req, res) => {
  console.log(`[QUOTATIONS] Converting quotation ID: ${req.params.id} to sale...`)
  try {
    const sale = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.findUnique({
        where: { id: req.params.id },
        include: { items: { include: { product: true } } }
      })
      if (!q) {
        console.warn(`[QUOTATIONS] Convert failed: Quotation ${req.params.id} not found`)
        throw new Error('Presupuesto no encontrado')
      }
      if (q.status === 'CONVERTED') {
        console.warn(`[QUOTATIONS] Convert failed: Quotation ${q.number} already converted`)
        throw new Error('Ya convertido')
      }

      // Check stock
      for (const it of q.items) {
        if (it.product.stock < it.qty) {
          console.warn(`[QUOTATIONS] Convert failed: Insufficient stock for ${it.product.name}`)
          throw new Error(`Stock insuficiente: ${it.product.name}`)
        }
      }

      const activeSession = await tx.cashSession.findFirst({ where: { status: 'OPEN' }, orderBy: { openedAt: 'desc' } })
      if (!activeSession) {
        console.warn('[QUOTATIONS] Convert failed: No open cash session')
        throw new Error('No hay sesión de caja abierta')
      }

      const config = await tx.systemConfig.findFirst() || { exchangeRateBCV: 36.5 }
      const now = new Date()

      // 1. Create Sale
      const newSale = await tx.sale.create({
        data: {
          saleNumber: `VQ-${q.number.split('-')[1]}`,
          subtotal: q.subtotal,
          globalDiscount: q.globalDiscount,
          iva: q.iva,
          total: q.total,
          totalBs: q.total * config.exchangeRateBCV,
          paymentMethod: 'Presupuesto',
          cashier: 'Sistema',
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          sessionId: activeSession.id,
          items: {
            create: q.items.map(it => ({
              productId: it.productId,
              qty: it.qty,
              price: it.price,
              discount: it.discount,
              warrantyDays: it.product.warrantyDays
            }))
          }
        }
      })

      // 2. Decrement Stock
      for (const it of q.items) {
        await tx.product.update({
          where: { id: it.productId },
          data: { stock: { decrement: it.qty } }
        })
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            quantity: -it.qty,
            type: 'OUT',
            reason: `Venta desde Presupuesto ${q.number}`,
            user: 'Sistema'
          }
        })
      }

      // 3. Mark Quotation as Converted
      await tx.quotation.update({
        where: { id: q.id },
        data: { status: 'CONVERTED' }
      })

      return newSale
    })
    console.log(`[QUOTATIONS] Quotation converted successfully: ${sale.saleNumber}`)
    res.json(sale)
  } catch (e) {
    console.error(`[QUOTATIONS] Error converting quotation ${req.params.id}: ${e.message}`)
    res.status(400).json({ error: e.message })
  }
})

export default router
