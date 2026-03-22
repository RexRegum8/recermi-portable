import express from 'express'
import { prisma } from '../db.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'rexermi-customer-secret-2024'

// Register Customer
router.post('/register', async (req, res) => {
  const { email, password, name, phone, address } = req.body
  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const customer = await prisma.customer.create({
      data: { email, password: hashedPassword, name, phone, address }
    })
    const { password: _, ...customerData } = customer
    res.status(201).json(customerData)
  } catch (e) {
    res.status(400).json({ error: 'Email ya registrado o datos inválidos' })
  }
})

// Login Customer
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const customer = await prisma.customer.findUnique({ where: { email } })
    if (!customer) return res.status(401).json({ error: 'Cliente no encontrado' })

    const valid = await bcrypt.compare(password, customer.password)
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' })

    const token = jwt.sign({ id: customer.id, email: customer.email, type: 'customer' }, JWT_SECRET, { expiresIn: '30d' })
    
    const { password: _, ...customerData } = customer
    res.json({ customer: customerData, token })
  } catch (e) {
    res.status(500).json({ error: 'Error en el servidor' })
  }
})

// Get Customer Profile (Protected)
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' })
  
  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const customer = await prisma.customer.findUnique({ 
      where: { id: decoded.id },
      include: { orders: { include: { items: true } } }
    })
    const { password: _, ...customerData } = customer
    res.json(customerData)
  } catch (e) {
    res.status(401).json({ error: 'Sesión inválida' })
  }
})

// Create Order (Protected)
router.post('/orders', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' })
  
  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const { items, total, paymentMethod, paymentRef, paymentProof } = req.body
    
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create the order
      const newOrder = await tx.order.create({
        data: {
          customerId: decoded.id,
          total,
          paymentMethod,
          paymentRef,
          paymentProof,
          status: 'PENDING',
          items: {
            create: items.map(it => ({
              productId: it.productId,
              qty: it.qty,
              price: it.price
            }))
          }
        },
        include: { items: true }
      })

      // 2. Decrement stock immediately
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.qty },
            movements: {
              create: {
                quantity: -item.qty,
                type: 'OUT',
                reason: `Reserva Pedido Online ${newOrder.id.slice(0, 8)}`,
                user: 'Sistema (Reserva)'
              }
            }
          }
        })
      }
      return newOrder
    })

    res.status(201).json(order)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al procesar el pedido o stock insuficiente' })
  }
})

// ADMIN: Get all orders
router.get('/orders-admin', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(orders)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener pedidos' })
  }
})

// ADMIN: Update order status
router.patch('/orders/:id/status', async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  try {
    const order = await prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!currentOrder) throw new Error('Pedido no encontrado')

      // If transition TO CANCELLED from any non-cancelled status, RESTORE stock
      if (status === 'CANCELLED' && currentOrder.status !== 'CANCELLED') {
        for (const item of currentOrder.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { 
              stock: { increment: item.qty },
              movements: {
                create: {
                  quantity: item.qty,
                  type: 'IN',
                  reason: `Anulación Pedido Online ${id.slice(0,8)}`,
                  user: 'Sistema (Admin)'
                }
              }
            }
          })
        }
      }
      
      // If transition TO COMPLETED, create a Sale record
      if (status === 'COMPLETED' && currentOrder.status !== 'COMPLETED') {
        const config = await tx.systemConfig.findFirst() || { ivaPercent: 16, exchangeRateBCV: 36.50 }
        
        // Find active session
        const activeSession = await tx.cashSession.findFirst({
          where: { status: 'OPEN' },
          orderBy: { openedAt: 'desc' }
        })

        const subtotal = currentOrder.total / (1 + (config.ivaPercent / 100))
        const iva = currentOrder.total - subtotal
        const now = new Date()
        const dateStr = now.toISOString().split('T')[0]
        const timeStr = now.toTimeString().split(' ')[0]

        await tx.sale.create({
          data: {
            saleNumber: `WEB-${id.slice(0, 8).toUpperCase()}`,
            subtotal,
            globalDiscount: 0,
            iva,
            total: currentOrder.total,
            totalBs: currentOrder.total * config.exchangeRateBCV,
            paymentMethod: currentOrder.paymentMethod || 'Web (Online)',
            paymentRef: currentOrder.paymentRef,
            paymentProof: currentOrder.paymentProof,
            cashier: 'Sistema (Online)',
            date: dateStr,
            time: timeStr,
            sessionId: activeSession ? activeSession.id : null,
            items: {
              create: currentOrder.items.map(it => ({
                productId: it.productId,
                qty: it.qty,
                price: it.price,
                discount: 0
              }))
            }
          }
        })
      }

      return await tx.order.update({
        where: { id },
        data: { status }
      })
    })
    res.json(order)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al actualizar pedido' })
  }
})

// ADMIN: Get all customers
router.get('/', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        createdAt: true,
        _count: { select: { orders: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(customers)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener clientes' })
  }
})

// ADMIN: Delete customer
router.delete('/:id', async (req, res) => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar cliente' })
  }
})

export default router
