import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()

// Get products with pagination
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 100 // Default to 100
  const skip = (page - 1) * limit
  
  console.log(`[PRODUCTS] Fetching products (Page: ${page}, Limit: ${limit})...`)
  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.product.count()
    ])
    
    console.log(`[PRODUCTS] Successfully fetched ${products.length} products`)
    res.json({
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (e) {
    console.error(`[PRODUCTS] Error fetching products: ${e.message}`)
    res.status(500).json({ error: 'Error al obtener productos' })
  }
})

// Create product
router.post('/', async (req, res) => {
  const { name, sku } = req.body
  console.log(`[PRODUCTS] Creating product: ${name} (SKU: ${sku})`)
  try {
    const product = await prisma.product.create({ data: req.body })
    console.log(`[PRODUCTS] Product created successfully: ${product.id}`)
    
    // Emit socket event
    const io = req.app.get('io')
    if (io) io.emit('product-created', product)
    
    res.status(201).json(product)
  } catch (e) {
    console.error(`[PRODUCTS] Error creating product: ${e.message}`)
    res.status(400).json({ error: 'Error al crear producto: ' + e.message })
  }
})

// Get stock movements
router.get('/movements', async (req, res) => {
  console.log('[PRODUCTS] Fetching stock movements...')
  try {
    const movements = await prisma.stockMovement.findMany({
      include: { product: true },
      orderBy: { date: 'desc' }
    })
    console.log(`[PRODUCTS] Successfully fetched ${movements.length} movements`)
    res.json(movements.map(m => ({
      ...m,
      sku: m.product.sku,
      product: m.product.name
    })))
  } catch (e) {
    console.error(`[PRODUCTS] Error fetching movements: ${e.message}`)
    res.status(500).json({ error: 'Error al obtener movimientos' })
  }
})

// Update product
router.patch('/:id', async (req, res) => {
  console.log(`[PRODUCTS] Updating product ID: ${req.params.id}`)
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body
    })
    console.log(`[PRODUCTS] Product ${req.params.id} updated successfully`)
    
    // Emit socket event
    const io = req.app.get('io')
    if (io) io.emit('product-updated', product)
    
    res.json(product)
  } catch (e) {
    console.error(`[PRODUCTS] Error updating product ${req.params.id}: ${e.message}`)
    res.status(400).json({ error: 'Error al actualizar producto: ' + e.message })
  }
})

// Record stock movement
router.post('/:id/movement', async (req, res) => {
  const { quantity, type, reason, user } = req.body
  console.log(`[PRODUCTS] Recording ${type} movement for product ID: ${req.params.id} (Qty: ${quantity})`)
  try {
    const qty = type === 'OUT' ? -Math.abs(quantity) : Math.abs(quantity)
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        stock: { increment: qty },
        movements: {
          create: { quantity: qty, type, reason, user }
        }
      }
    })
    console.log(`[PRODUCTS] Movement recorded successfully for product ${req.params.id}`)
    
    // Emit socket event
    const io = req.app.get('io')
    if (io) io.emit('product-stock-updated', { productId: product.id, newStock: product.stock })
    
    res.json(product)
  } catch (e) {
    console.error(`[PRODUCTS] Error recording movement for product ${req.params.id}: ${e.message}`)
    res.status(400).json({ error: 'Error al registrar movimiento' })
  }
})

// Get product movement history
router.get('/:id/history', async (req, res) => {
  console.log(`[PRODUCTS] Fetching movement history for product ID: ${req.params.id}`)
  try {
    const history = await prisma.stockMovement.findMany({
      where: { productId: req.params.id },
      orderBy: { date: 'desc' },
      take: 50
    })
    console.log(`[PRODUCTS] Successfully fetched history for product ${req.params.id}`)
    res.json(history)
  } catch (e) {
    console.error(`[PRODUCTS] Error fetching history for product ${req.params.id}: ${e.message}`)
    res.status(500).json({ error: 'Error al obtener historial' })
  }
})

export default router
