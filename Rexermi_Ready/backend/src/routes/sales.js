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
  const { saleNumber, items, subtotal, globalDiscount, iva, total, totalBs, paymentMethod, paymentRef, cashier, date, time } = req.body
  try {
    const sale = await prisma.$transaction(async (tx) => {
      // Find active session
      const activeSession = await tx.cashSession.findFirst({
        where: { status: 'OPEN' },
        orderBy: { openedAt: 'desc' }
      })

      // 1. Create Sale
      const createdSale = await tx.sale.create({
        data: {
          saleNumber, subtotal, globalDiscount, iva, total, totalBs, paymentMethod, paymentRef, cashier, date, time,
          sessionId: activeSession ? activeSession.id : null,
          items: {
            create: items.map(i => ({
              productId: i.productId, // We need to ensure frontend sends productId
              qty: i.qty,
              price: i.price,
              discount: i.discount || 0
            }))
          }
        }
      })

      // 2. Update stock for each item
      for (const item of items) {
        await tx.product.update({
          where: { sku: item.sku }, // Using SKU as key since id might differ between local/DB initially
          data: { stock: { decrement: item.qty } }
        })
        
        // 3. Create stock movement
        const product = await tx.product.findUnique({ where: { sku: item.sku } })
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantity: -item.qty,
            type: 'OUT',
            reason: `Venta ${saleNumber}`,
            user: cashier
          }
        })
      }
      return createdSale
    })
    res.status(201).json(sale)
  } catch (e) {
    console.error(e)
    res.status(400).json({ error: 'Error al registrar venta' })
  }
})

export default router
