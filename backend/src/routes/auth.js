import express from 'express'
import { prisma } from '../db.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'rexermi-secret-key-2024'

router.get('/needs-setup', async (req, res) => {
  try {
    const count = await prisma.user.count().catch(() => 0)
    res.json({ needsSetup: count === 0 })
  } catch (e) {
    res.status(500).json({ error: 'Error checking setup status' })
  }
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' })

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    
    const { password: _, ...userData } = user
    res.json({ user: userData, token })
  } catch (e) {
    res.status(500).json({ error: 'Error en el servidor' })
  }
})

// User Management
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, name: true, username: true, role: true, avatar: true, 
        cedula: true, phone: true, cvData: true, photo: true, dataFile: true,
        address: true, birthday: true, gender: true, hiredAt: true, salary: true,
        _count: { select: { attendances: true, absences: true } }
      }
    })
    res.json(users)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

router.post('/register', async (req, res) => {
  const { name, username, password, role, avatar, cedula, phone, cvData, photo, dataFile, pPOS, pInventory, pSales, pService, pOrders, pCustomers, pSettings } = req.body
  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { 
        name, username, password: hashedPassword, role, avatar, 
        cedula, phone, cvData, photo, dataFile,
        pPOS: !!pPOS, pInventory: !!pInventory, pSales: !!pSales, 
        pService: !!pService, pOrders: !!pOrders, pCustomers: !!pCustomers, 
        pSettings: !!pSettings 
      }
    })
    const { password: _, ...userData } = user
    res.status(201).json(userData)
  } catch (e) {
    res.status(400).json({ error: 'Nombre de usuario ya existe o datos inválidos' })
  }
})

router.patch('/:id', async (req, res) => {
  const { 
    name, username, password, role, avatar, cedula, phone, cvData, photo, dataFile, 
    pPOS, pInventory, pSales, pService, pOrders, pCustomers, pSettings,
    address, birthday, gender, hiredAt, salary 
  } = req.body
  try {
    const data = { 
      name, username, role, avatar, 
      cedula, phone, cvData, photo, dataFile,
      pPOS, pInventory, pSales, pService, pOrders, pCustomers, pSettings,
      address, 
      birthday: birthday ? new Date(birthday) : undefined, 
      gender, 
      hiredAt: hiredAt ? new Date(hiredAt) : undefined, 
      salary: salary !== undefined ? Number(salary) : undefined
    }
    if (password) {
      data.password = await bcrypt.hash(password, 10)
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data
    })
    const { password: _, ...userData } = user
    res.json(userData)
  } catch (e) {
    res.status(400).json({ error: 'Error al actualizar usuario' })
  }
})

// GET full employee detail
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        attendances: { orderBy: { checkIn: 'desc' }, take: 50 },
        absences: { orderBy: { date: 'desc' }, take: 50 }
      }
    })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    const { password: _, ...userData } = user
    res.json(userData)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener detalles del empleado' })
  }
})

// Attendance & Absences
router.post('/:id/attendance', async (req, res) => {
  const { type, notes } = req.body // 'IN' or 'OUT'
  const date = new Date().toISOString().split('T')[0]
  try {
    if (type === 'IN') {
      const att = await prisma.attendance.create({
        data: { userId: req.params.id, date, notes }
      })
      return res.json(att)
    } else {
      const last = await prisma.attendance.findFirst({
        where: { userId: req.params.id, date, checkOut: null },
        orderBy: { checkIn: 'desc' }
      })
      if (!last) return res.status(400).json({ error: 'No hay entrada abierta hoy' })
      const updated = await prisma.attendance.update({
        where: { id: last.id },
        data: { checkOut: new Date(), notes: notes || last.notes }
      })
      res.json(updated)
    }
  } catch (e) {
    res.status(400).json({ error: 'Error al registrar asistencia' })
  }
})

router.post('/:id/absences', async (req, res) => {
  const { date, reason, isJustified } = req.body
  try {
    const abs = await prisma.absence.create({
      data: { userId: req.params.id, date, reason, isJustified: !!isJustified }
    })
    res.status(201).json(abs)
  } catch (e) {
    res.status(400).json({ error: 'Error al registrar falta' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (e) {
    res.status(400).json({ error: 'Error al eliminar usuario' })
  }
})

export default router
