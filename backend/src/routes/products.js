import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { prisma } from '../db.js'

const router = express.Router()

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'backend/src/uploads/products'
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'p-' + uniqueSuffix + path.extname(file.originalname))
  }
})
const upload = multer({ storage })

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
router.post('/', upload.single('imageFile'), async (req, res) => {
  const { name, sku, category, description, price, cost, stock, minStock, warehouse, image, featured, showInCatalog, warrantyDays } = req.body
  console.log(`[PRODUCTS] Creating product: ${name} (SKU: ${sku})`)
  
  let finalImage = image || '📦'
  if (req.file) {
    // If a physical file was uploaded, use the generated path
    finalImage = `/uploads/products/${req.file.filename}`
  }

  try {
    const product = await prisma.product.create({ 
      data: {
        sku: sku?.toUpperCase(),
        name,
        category: category || 'General',
        description,
        price: Number(price) || 0,
        cost: Number(cost) || 0,
        stock: Number(stock) || 0,
        minStock: Number(minStock) || 5,
        warehouse: warehouse || 'Principal',
        image: finalImage,
        featured: !!featured,
        showInCatalog: showInCatalog !== undefined ? !!showInCatalog : true,
        warrantyDays: Number(warrantyDays) || 30
      }
    })
    console.log(`[PRODUCTS] Product created successfully: ${product.id}`)
    
    const io = req.app.get('io')
    if (io) io.emit('product-created', product)
    
    res.status(201).json(product)
  } catch (e) {
    console.error(`[PRODUCTS] Error creating product: ${e.message}`)
    res.status(400).json({ error: 'Error al crear producto' })
  }
})

// Get stock movements
router.get('/movements', async (req, res) => {
// ... same as before
})

// Update product
router.patch('/:id', upload.single('imageFile'), async (req, res) => {
  console.log(`[PRODUCTS] Updating product ID: ${req.params.id}`)
  const { name, sku, category, description, price, cost, stock, minStock, warehouse, image, featured, showInCatalog, warrantyDays } = req.body
  
  try {
    const data = {}
    if (sku) data.sku = sku.toUpperCase()
    if (name) data.name = name
    if (category) data.category = category
    if (description !== undefined) data.description = description
    if (price !== undefined) data.price = Number(price)
    if (cost !== undefined) data.cost = Number(cost)
    if (stock !== undefined) data.stock = Number(stock)
    if (minStock !== undefined) data.minStock = Number(minStock)
    if (warehouse) data.warehouse = warehouse
    if (featured !== undefined) data.featured = !!featured
    if (showInCatalog !== undefined) data.showInCatalog = !!showInCatalog
    if (warrantyDays !== undefined) data.warrantyDays = Number(warrantyDays)

    if (req.file) {
       data.image = `/uploads/products/${req.file.filename}`
    } else if (image) {
       data.image = image
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data
    })
    console.log(`[PRODUCTS] Product ${req.params.id} updated successfully`)
    
    const io = req.app.get('io')
    if (io) io.emit('product-updated', product)
    
    res.json(product)
  } catch (e) {
    console.error(`[PRODUCTS] Error updating product ${req.params.id}: ${e.message}`)
    res.status(400).json({ error: 'Error al actualizar producto' })
  }
})

// Rest of the file unchanged...
// ... (delete, movement, history)

// Delete product
router.delete('/:id', async (req, res) => {
  console.log(`[PRODUCTS] Deleting product ID: ${req.params.id}`)
  try {
    await prisma.product.delete({ where: { id: req.params.id } })
    console.log(`[PRODUCTS] Product ${req.params.id} deleted successfully`)
    
    const io = req.app.get('io')
    if (io) io.emit('product-deleted', req.params.id)
    
    res.json({ success: true })
  } catch (e) {
    console.error(`[PRODUCTS] Error deleting product ${req.params.id}: ${e.message}`)
    res.status(400).json({ error: 'Error al eliminar producto' })
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
