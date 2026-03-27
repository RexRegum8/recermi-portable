import express from 'express'
import { prisma } from '../db.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'rexermi-customer-secret-2024'

// Register Customer
router.post('/register', async (req, res) => {
  const { email, name } = req.body
  console.log(`[CUSTOMERS] Registering new customer: ${name} (${email})`)
  try {
    const { email, password, name, phone, address } = req.body
    const hashedPassword = await bcrypt.hash(password, 10)
    const customer = await prisma.customer.create({
      data: { 
        email, 
        password: hashedPassword, 
        name, 
        phone, 
        address, 
        points: 0 
      }
    })
    const token = jwt.sign({ id: customer.id, email: customer.email, type: 'customer' }, JWT_SECRET, { expiresIn: '30d' })
    res.cookie('customer_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    })
    const { password: _, ...customerData } = customer
    console.log(`[CUSTOMERS] Customer registered successfully: ${customer.id}`)
    res.status(201).json({ customer: customerData, token })
  } catch (e) {
    console.error(`[CUSTOMERS] Registration error for ${email}: ${e.message}`)
    res.status(400).json({ error: 'Email ya registrado o datos inválidos' })
  }
})

// Login Customer
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  console.log(`[CUSTOMERS] Login attempt for customer: ${email}`)
  try {
    const customer = await prisma.customer.findUnique({ where: { email } })
    if (!customer) {
      console.warn(`[CUSTOMERS] Login failed: Customer ${email} not found`)
      return res.status(401).json({ error: 'Cliente no encontrado' })
    }

    const valid = await bcrypt.compare(password, customer.password)
    if (!valid) {
      console.warn(`[CUSTOMERS] Login failed: Incorrect password for customer ${email}`)
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }

    const token = jwt.sign({ id: customer.id, email: customer.email, type: 'customer' }, JWT_SECRET, { expiresIn: '30d' })
    
    // Set httpOnly cookie for customer
    res.cookie('customer_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    })

    const { password: _, ...customerData } = customer
    console.log(`[CUSTOMERS] Login successful for customer: ${email}`)
    res.json({ customer: customerData, token })
  } catch (e) {
    console.error(`[CUSTOMERS] Login error for customer ${email}: ${e.message}`)
    res.status(500).json({ error: 'Error en el servidor' })
  }
})

router.post('/logout', (req, res) => {
  console.log('[CUSTOMERS] Logging out customer...')
  res.clearCookie('customer_token')
  res.json({ message: 'Sesión cerrada' })
})

// Get Customer Profile (Protected via Cookie or Header)
router.get('/me', async (req, res) => {
  let token = req.cookies.customer_token
  
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) return res.status(401).json({ error: 'No autorizado' })
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const customer = await prisma.customer.findUnique({ 
      where: { id: decoded.id },
      include: { 
        orders: { include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } },
        sales: { include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } },
        loyaltyHistory: { orderBy: { date: 'desc' }, take: 20 }
      }
    })
    if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' })
    const { password: _, ...customerData } = customer
    res.json(customerData)
  } catch (e) {
    res.status(401).json({ error: 'Sesión inválida' })
  }
})

// Update Customer Profile
router.patch('/me', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' })
  
  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const { name, phone, address } = req.body
    const customer = await prisma.customer.update({
      where: { id: decoded.id },
      data: { 
        name, 
        phone, 
        address
      }
    })
    const { password: _, ...customerData } = customer
    res.json(customerData)
  } catch (e) {
    res.status(400).json({ error: 'Error al actualizar perfil' })
  }
})

// Create Order (Protected via Cookie)
router.post('/orders', async (req, res) => {
  const token = req.cookies.customer_token
  if (!token) return res.status(401).json({ error: 'No autorizado' })
  
  console.log('[CUSTOMERS] Processing new web order...')
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const { items, total, paymentMethod, paymentRef, paymentProof } = req.body
    
    const order = await prisma.$transaction(async (tx) => {
      // 1. Check stock
      for (const it of items) {
        const product = await tx.product.findUnique({ where: { id: it.productId } })
        if (!product || product.stock < it.qty) {
          console.warn(`[CUSTOMERS] Order failed: Insufficient stock for ${product?.name || it.productId}`)
          throw new Error(`Stock insuficiente para: ${product?.name || it.productId}`)
        }
      }

      // 2. Create Order
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

      // 3. Decrement stock
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
      // 4. Reset pending discount
      await tx.customer.update({
        where: { id: decoded.id },
        data: { pendingDiscount: 0 }
      })

      // 5. Grant Points
      const config = await tx.systemConfig.findFirst() || { fidelityEnabled: false, ptsPer10Usd: 1 }
      if (config.fidelityEnabled) {
        const pts = Math.floor(total / 10) * config.ptsPer10Usd
        if (pts > 0) {
          await tx.customer.update({
            where: { id: decoded.id },
            data: { points: { increment: pts } }
          })
          await tx.loyaltyMovement.create({
            data: {
              customerId: decoded.id,
              points: pts,
              type: 'EARNED',
              reason: `Pedido Web ${newOrder.id.slice(0, 8)}`
            }
          })
        }
      }
      
      return newOrder
    })

    console.log(`[CUSTOMERS] Web order processed successfully: ${order.id}`)
    res.status(201).json(order)
  } catch (e) {
    console.error(`[CUSTOMERS] Error processing web order: ${e.message}`)
    res.status(400).json({ error: e.message || 'Error al procesar el pedido o stock insuficiente' })
  }
})

// ADMIN: Get all orders
router.get('/orders-admin', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { 
        customer: {
          select: { id: true, name: true, email: true, phone: true }
        }, 
        items: { include: { product: false } } 
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(orders || [])
  } catch (e) {
    console.error('Error in orders-admin:', e)
    res.status(500).json({ error: 'Error al obtener pedidos web' })
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

      // Stock Restoration if Cancelled
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
      
      // Conversion to Sale if Completed
      if (status === 'COMPLETED' && currentOrder.status !== 'COMPLETED') {
        const config = await tx.systemConfig.findFirst() || { ivaPercent: 16, exchangeRateBCV: 36.50, fidelityEnabled: false, ptsPer10Usd: 1 }
        const activeSession = await tx.cashSession.findFirst({ where: { status: 'OPEN' }, orderBy: { openedAt: 'desc' } })
        if (!activeSession) throw new Error('Caja Cerrada')

        const subtotal = currentOrder.total / (1 + (config.ivaPercent / 100))
        const iva = currentOrder.total - subtotal
        const now = new Date()

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
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0],
            sessionId: activeSession.id,
            customerId: currentOrder.customerId,
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

        // Loyalty Pts
        if (config.fidelityEnabled && currentOrder.customerId) {
          const pts = Math.floor(currentOrder.total / 10) * config.ptsPer10Usd
          if (pts > 0) {
            await tx.customer.update({
              where: { id: currentOrder.customerId },
              data: { points: { increment: pts } }
            })
          }
        }
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
        points: true,
        pendingDiscount: true,
        createdAt: true,
        _count: { select: { orders: true, sales: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(customers)
  } catch (e) {
    console.error('[BACKEND-ERR] Error en GET /api/customers:', e)
    res.status(500).json({ error: 'Error al obtener clientes' })
  }
})

// ADMIN: Get customer details (History & Points)
router.get('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        orders: { include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } },
        sales: { include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } },
        loyaltyHistory: { orderBy: { date: 'desc' }, take: 20 }
      }
    })
    if (!customer) return res.status(404).json({ error: 'No encontrado' })

    const { password: _, ...customerData } = customer
    res.json(customerData)
  } catch (e) {
    console.error('[BACKEND-ERR] Error en GET /api/customers/:id:', e)
    res.status(500).json({ error: 'Error al cargar detalles del cliente' })
  }
})

// ADMIN: Update customer full profile
router.patch('/:id/admin-update', async (req, res) => {
  const { name, email, phone, address, points } = req.body
  try {
    const oldCustomer = await prisma.customer.findUnique({ where: { id: req.params.id } })
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { 
        name, 
        email,
        phone, 
        address, 
        points: points !== undefined ? Number(points) : undefined
      }
    })
    
    if (points !== undefined && oldCustomer && oldCustomer.points !== Number(points)) {
      await prisma.loyaltyMovement.create({
        data: {
          customerId: customer.id,
          points: Number(points) - oldCustomer.points,
          type: 'ADMIN_ADJ',
          reason: 'Ajuste administrativo de perfil'
        }
      })
    }
    res.json(customer)
  } catch (e) {
    res.status(400).json({ error: 'Error al actualizar perfil del cliente' })
  }
})

// ADMIN: Update customer points
router.patch('/:id', async (req, res) => {
  const { points } = req.body
  try {
    const oldCustomer = await prisma.customer.findUnique({ where: { id: req.params.id } })
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { points: Number(points) }
    })
    if (oldCustomer && oldCustomer.points !== Number(points)) {
      await prisma.loyaltyMovement.create({
        data: {
          customerId: customer.id,
          points: Number(points) - oldCustomer.points,
          type: 'ADMIN_ADJ',
          reason: 'Ajuste manual de puntos'
        }
      })
    }
    res.json(customer)
  } catch (e) {
    res.status(400).json({ error: 'Error al actualizar puntos del cliente' })
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
