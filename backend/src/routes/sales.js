import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()

// Get sales by session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      where: { sessionId: req.params.sessionId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(sales)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener ventas' })
  }
})

// Cash Closure
router.post('/closure', async (req, res) => {
  const { totalSales, totalItems, totalAmountUsd, totalAmountBs, ivaTotal, details, cashier } = req.body
  try {
    const closure = await prisma.closure.create({
      data: {
        totalSales, totalItems, totalAmountUsd, totalAmountBs, ivaTotal,
        details: JSON.stringify(details),
        cashier
      }
    })
    res.status(201).json(closure)
  } catch (e) {
    res.status(400).json({ error: 'Error al registrar cierre de caja' })
  }
})

// Register a sale
router.post('/', async (req, res) => {
  const { saleNumber, items, subtotal, globalDiscount, iva, total, totalBs, paymentMethod, paymentRef, cashier, date, time, customerId } = req.body
  try {
    const sale = await prisma.$transaction(async (tx) => {
      // Find active session
      const activeSession = await tx.cashSession.findFirst({
        where: { status: 'OPEN' },
        orderBy: { openedAt: 'desc' }
      })

      if (!activeSession) throw new Error('No hay una sesión de caja abierta')

      const config = await tx.systemConfig.findFirst() || { fidelityEnabled: false, ptsPer10Usd: 1 }

      // 1. Generate/Fix Sale Number to avoid collision
      let finalSaleNumber = saleNumber
      const existingSale = await tx.sale.findUnique({ where: { saleNumber } })
      
      if (existingSale) {
        const lastSale = await tx.sale.findFirst({ orderBy: { createdAt: 'desc' } })
        if (lastSale && lastSale.saleNumber.startsWith('V-')) {
          const lastNum = parseInt(lastSale.saleNumber.split('-')[1])
          finalSaleNumber = `V-${String(lastNum + 1).padStart(4, '0')}`
        } else {
          finalSaleNumber = `V-${String(Date.now()).slice(-4)}`
        }
      }

      // 1. Create Sale
      const createdSale = await tx.sale.create({
        data: {
          saleNumber: finalSaleNumber, subtotal, globalDiscount, iva, total, totalBs, paymentMethod, paymentRef, cashier, date, time,
          sessionId: activeSession?.id,
          customerId: customerId || null,
          items: {
            create: items.map(i => ({
              productId: i.productId,
              qty: i.qty,
              price: i.price,
              discount: i.discount || 0,
              warrantyDays: i.warrantyDays || 0
            }))
          }
        }
      })

      // 2. Update stock & Record points
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } }
        })
        
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: -item.qty,
            type: 'OUT',
            reason: `Venta ${createdSale.saleNumber}`,
            user: cashier
          }
        })
      }

      // 3. Fidelity Points & Reset Discount
      if (customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: { pendingDiscount: 0 }
        })

        if (config.fidelityEnabled) {
          const pts = Math.floor(total / 10) * config.ptsPer10Usd
          if (pts > 0) {
            await tx.customer.update({
              where: { id: customerId },
              data: { points: { increment: pts } }
            })
            await tx.loyaltyMovement.create({
              data: {
                customerId,
                points: pts,
                type: 'EARNED',
                reason: `Venta POS ${createdSale.saleNumber}`
              }
            })
          }
        }
      }

      return createdSale
    })
    res.status(201).json(sale)
  } catch (e) {
    console.error(e)
    res.status(400).json({ error: e.message || 'Error al registrar venta' })
  }
})

export default router
