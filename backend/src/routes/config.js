import express from 'express'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { prisma } from '../db.js'
import { authenticate, ipFilter } from '../middleware/auth.js'

const router = express.Router()

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'backend/src/uploads/system'
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname))
  }
})
const upload = multer({ storage })

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

// Conditional authentication: bypass if no users exist (initial setup)
async function conditionalAuth(req, res, next) {
  try {
    const count = await prisma.user.count()
    if (count === 0) return next()
    return authenticate(req, res, next)
  } catch (e) {
    return authenticate(req, res, next)
  }
}

// Update system config
router.patch('/', upload.single('logoFile'), conditionalAuth, async (req, res) => {
  const { 
    storeName, storeRIF, storeAddress, storePhone, exchangeRateBCV, exchangeRateUSDT, ivaPercent, 
    defaultWarrantyDays, fidelityEnabled, ptsPer10Usd, catalogUrl, tunnelMode, tunnelToken, 
    customDomain, companyLogo,
    pPriceBond, pPricePhoto, pPriceGlace, pPriceColorMult, pPriceBWMult, pPriceSimpleMult, pPriceDoubleMult
  } = req.body
  
  try {
    const data = {}
    if (storeName) data.storeName = storeName
    if (storeRIF) data.storeRIF = storeRIF
    if (storeAddress) data.storeAddress = storeAddress
    if (storePhone) data.storePhone = storePhone
    if (exchangeRateBCV !== undefined) data.exchangeRateBCV = Number(exchangeRateBCV)
    if (exchangeRateUSDT !== undefined) data.exchangeRateUSDT = Number(exchangeRateUSDT)
    if (ivaPercent !== undefined) data.ivaPercent = Number(ivaPercent)
    if (defaultWarrantyDays !== undefined) data.defaultWarrantyDays = Number(defaultWarrantyDays)
    if (fidelityEnabled !== undefined) data.fidelityEnabled = !!fidelityEnabled
    if (ptsPer10Usd !== undefined) data.ptsPer10Usd = Number(ptsPer10Usd)
    if (catalogUrl) data.catalogUrl = catalogUrl
    if (tunnelMode) data.tunnelMode = tunnelMode
    if (tunnelToken !== undefined) data.tunnelToken = tunnelToken
    if (customDomain !== undefined) data.customDomain = customDomain

    // Precios de Impresión
    if (pPriceBond !== undefined) data.pPriceBond = Number(pPriceBond)
    if (pPricePhoto !== undefined) data.pPricePhoto = Number(pPricePhoto)
    if (pPriceGlace !== undefined) data.pPriceGlace = Number(pPriceGlace)
    if (pPriceColorMult !== undefined) data.pPriceColorMult = Number(pPriceColorMult)
    if (pPriceBWMult !== undefined) data.pPriceBWMult = Number(pPriceBWMult)
    if (pPriceSimpleMult !== undefined) data.pPriceSimpleMult = Number(pPriceSimpleMult)
    if (pPriceDoubleMult !== undefined) data.pPriceDoubleMult = Number(pPriceDoubleMult)

    if (req.file) {
      data.companyLogo = `/uploads/system/${req.file.filename}`
    } else if (companyLogo !== undefined) {
      data.companyLogo = companyLogo
    }

    const config = await prisma.systemConfig.update({
      where: { id: 1 },
      data
    })
    console.log('[CONFIG] System configuration updated successfully')
    res.json(config)
  } catch (e) {
    console.error(`[CONFIG] Error updating configuration: ${e.message}`)
    res.status(400).json({ error: 'Error al actualizar configuración' })
  }
})

// Keep existing GET / and fetch routes...
function dummy() {}

export default router
