import express from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../db.js'
import { authenticate, ipFilter } from '../middleware/auth.js'

const router = express.Router()

// Fetch official BCV rate
router.get('/fetch-bcv', async (req, res) => {
  console.log('[CONFIG] Fetching official BCV rate...')
  try {
    const resp = await fetch('https://ve.dolarapi.com/v1/dolares/oficial')
    const data = await resp.json()
    if (data && data.promedio) {
      console.log(`[CONFIG] BCV rate fetched successfully: ${data.promedio}`)
      res.json({ price: data.promedio, date: data.fecha || data.last_update })
    } else {
      console.error('[CONFIG] Failed to fetch BCV rate: Unexpected API format')
      res.status(500).json({ error: 'Formato de API no reconocido' })
    }
  } catch (e) {
    console.error(`[CONFIG] Error fetching BCV rate: ${e.message}`)
    res.status(500).json({ error: 'Error al conectar con el servicio de tasas' })
  }
})

// Fetch parallel rate (for USDT)
router.get('/fetch-paralelo', async (req, res) => {
  console.log('[CONFIG] Fetching parallel rate (USDT)...')
  try {
    const resp = await fetch('https://ve.dolarapi.com/v1/dolares/paralelo')
    const data = await resp.json()
    if (data && data.promedio) {
      console.log(`[CONFIG] Parallel rate fetched successfully: ${data.promedio}`)
      res.json({ price: data.promedio })
    } else {
      console.error('[CONFIG] Failed to fetch parallel rate: Unexpected API format')
      res.status(500).json({ error: 'Formato de API no reconocido' })
    }
  } catch (e) {
    console.error(`[CONFIG] Error fetching parallel rate: ${e.message}`)
    res.status(500).json({ error: 'Error al conectar con el servicio de tasas' })
  }
})

// Get current system config (Public, but filtered)
router.get('/', async (req, res) => {
  console.log('[CONFIG] Fetching system configuration...')
  try {
    let config = await prisma.systemConfig.findUnique({ where: { id: 1 } })
    if (!config) {
      console.log('[CONFIG] No configuration found. Creating default...')
      config = await prisma.systemConfig.create({ data: { id: 1 } })
    }

    // Security: Filter sensitive fields for non-admin requests
    let isAdmin = false
    const token = req.cookies?.auth_token || req.headers.authorization?.split(' ')[1]
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rexermi-secret-key-2024')
        const user = await prisma.user.findUnique({ where: { id: decoded.id } })
        if (user && user.role === 'admin') isAdmin = true
      } catch (e) {}
    }

    if (!isAdmin) {
      const { tunnelToken, ...publicConfig } = config
      return res.json(publicConfig)
    }

    console.log('[CONFIG] System configuration fetched successfully')
    res.json(config)
  } catch (e) {
    console.error(`[CONFIG] Error fetching configuration: ${e.message}`)
    res.status(500).json({ error: 'Error al obtener configuración' })
  }
})

// Update system config
router.patch('/', async (req, res, next) => {
  try {
    const count = await prisma.user.count()
    if (count === 0) return next()
    authenticate(req, res, next)
  } catch (e) {
    authenticate(req, res, next)
  }
}, ipFilter, async (req, res) => {
  console.log('[CONFIG] Updating system configuration...')
  try {
    const config = await prisma.systemConfig.update({
      where: { id: 1 },
      data: req.body
    })
    console.log('[CONFIG] System configuration updated successfully')
    res.json(config)
  } catch (e) {
    console.error(`[CONFIG] Error updating configuration: ${e.message}`)
    console.error('[BACKEND-ERR] Error en PATCH /api/config:', e)
    res.status(400).json({ error: 'Error al actualizar configuración' })
  }
})

export default router
