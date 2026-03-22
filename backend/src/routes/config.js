import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()

// Fetch official BCV rate
router.get('/fetch-bcv', async (req, res) => {
  try {
    const resp = await fetch('https://ve.dolarapi.com/v1/dolares/oficial')
    const data = await resp.json()
    if (data && data.promedio) {
      res.json({ price: data.promedio })
    } else {
      res.status(500).json({ error: 'Formato de API no reconocido' })
    }
  } catch (e) {
    res.status(500).json({ error: 'Error al conectar con el servicio de tasas' })
  }
})

// Fetch parallel rate (for USDT)
router.get('/fetch-paralelo', async (req, res) => {
  try {
    const resp = await fetch('https://ve.dolarapi.com/v1/dolares/paralelo')
    const data = await resp.json()
    if (data && data.promedio) {
      res.json({ price: data.promedio })
    } else {
      res.status(500).json({ error: 'Formato de API no reconocido' })
    }
  } catch (e) {
    res.status(500).json({ error: 'Error al conectar con el servicio de tasas' })
  }
})

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
