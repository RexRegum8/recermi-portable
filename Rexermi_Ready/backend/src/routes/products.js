import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany()
    res.json(products)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener productos' })
  }
})

// Create product
router.post('/', async (req, res) => {
  try {
    const product = await prisma.product.create({ data: req.body })
    res.status(201).json(product)
  } catch (e) {
    res.status(400).json({ error: 'Error al crear producto' })
  }
})

// Get stock movements
router.get('/movements', async (req, res) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      include: { product: true },
      orderBy: { date: 'desc' }
    })
    res.json(movements.map(m => ({
      ...m,
      sku: m.product.sku,
      product: m.product.name
    })))
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener movimientos' })
  }
})

// Update product
router.patch('/:id', async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body
    })
    res.json(product)
  } catch (e) {
    res.status(400).json({ error: 'Error al actualizar producto' })
  }
})

// Record stock movement
router.post('/:id/movement', async (req, res) => {
  const { quantity, type, reason, user } = req.body
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
    res.json(product)
  } catch (e) {
    res.status(400).json({ error: 'Error al registrar movimiento' })
  }
})

export default router
