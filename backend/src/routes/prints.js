import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import pdf from 'pdf-parse'
import { prisma } from '../db.js'

const router = express.Router()

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'backend/src/uploads/prints'
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
})

// Get all print orders
router.get('/', async (req, res) => {
  try {
    const orders = await prisma.printOrder.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json(orders)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener pedidos' })
  }
})

// Create print order (from Catalog)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { customerName, customerPhone, paperType, colorMode, sides, quantity, pages: reqPages, customerId } = req.body
    const file = req.file
    if (!file) return res.status(400).json({ error: 'No se subió ningún archivo' })

    // Get config for pricing
    const config = await prisma.systemConfig.findUnique({ where: { id: 1 } }) || {}
    
    // Determine page count (trust request if provided, fallback to detection)
    let pages = reqPages ? Number(reqPages) : 1
    if (file.mimetype === 'application/pdf' && !reqPages) {
      const dataBuffer = fs.readFileSync(file.path)
      const data = await pdf(dataBuffer)
      pages = data.numpages || 1
    }

    const basePrice = paperType === 'Bond' ? (config.pPriceBond ?? 0.2) : 
                    paperType === 'Fotográfico' ? (config.pPricePhoto ?? 1.5) : 
                    (config.pPriceGlace ?? 2.0)
                    
    const colorFactor = colorMode === 'COLOR' ? (config.pPriceColorMult ?? 2.5) : (config.pPriceBWMult ?? 1.0)
    const sideFactor = sides === 'DOBLE' ? (config.pPriceDoubleMult ?? 1.8) : (config.pPriceSimpleMult ?? 1.0)
    
    const estimatedTotal = pages * Number(quantity) * basePrice * colorFactor * sideFactor
    
    const orderCount = await prisma.printOrder.count()
    const orderNumber = `PRNT-${String(orderCount + 1).padStart(4, '0')}`

    const order = await prisma.printOrder.create({
      data: {
        orderNumber,
        customerName,
        customerPhone,
        customerId: customerId || null,
        filename: file.originalname,
        fileSize: file.size,
        fileUrl: `/uploads/prints/${file.filename}`,
        paperType,
        colorMode,
        sides,
        pages,
        quantity: Number(quantity),
        estimatedTotal,
        status: 'PENDING_REVIEW'
      }
    })

    // Notify Admin via Socket
    const io = req.app.get('io')
    if (io) io.emit('new-print-order', order)

    res.status(201).json(order)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al procesar el archivo: ' + e.message })
  }
})

// Download/View file
router.get('/file/:filename', (req, res) => {
  const filePath = path.join(process.cwd(), 'backend/src/uploads/prints', req.params.filename)
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath)
  } else {
    res.status(404).send('Archivo no encontrado')
  }
})

// Update order (Admin validation)
router.patch('/:id', async (req, res) => {
  try {
    const { finalTotal, status, notes } = req.body
    const order = await prisma.printOrder.update({
      where: { id: req.params.id },
      data: { finalTotal, status, notes }
    })
    res.json(order)
  } catch (e) {
    res.status(400).json({ error: 'Error al actualizar pedido' })
  }
})

export default router
