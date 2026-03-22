import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()

// Get current system config
router.get('/', async (req, res) => {
  try {
    let config = await prisma.systemConfig.findUnique({ where: { id: 1 } })
    if (!config) {
      // Create default if not exists
      config = await prisma.systemConfig.create({ data: { id: 1 } })
    }
    res.json(config)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener configuración' })
  }
})

// Update system config
router.patch('/', async (req, res) => {
  try {
    const config = await prisma.systemConfig.update({
      where: { id: 1 },
      data: req.body
    })
    res.json(config)
  } catch (e) {
    res.status(400).json({ error: 'Error al actualizar configuración' })
  }
})

export default router
