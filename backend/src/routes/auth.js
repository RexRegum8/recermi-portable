import express from 'express'
import { prisma } from '../db.js'
import { authenticate, ipFilter } from '../middleware/auth.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'rexermi-secret-key-2024'

router.get('/needs-setup', async (req, res) => {
  console.log('[AUTH] Checking if setup is needed...')
  try {
    const count = await prisma.user.count().catch(() => 0)
    console.log(`[AUTH] Setup check completed. Needs setup: ${count === 0}`)
    res.json({ needsSetup: count === 0 })
  } catch (e) {
    console.error(`[AUTH] Error checking setup status: ${e.message}`)
    res.status(500).json({ error: 'Error checking setup status' })
  }
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  console.log(`[AUTH] Login attempt for user: ${username}`)
  try {
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      console.warn(`[AUTH] Login failed: User ${username} not found`)
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      console.warn(`[AUTH] Login failed: Incorrect password for user ${username}`)
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    
    // Set httpOnly cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    const { password: _, ...userData } = user
    console.log(`[AUTH] Login successful for user: ${username}`)
    res.json({ user: userData, token })
  } catch (e) {
    console.error(`[AUTH] Login error for user ${username}: ${e.message}`)
    res.status(500).json({ error: 'Error en el servidor' })
  }
})

router.post('/logout', (req, res) => {
  console.log('[AUTH] Logging out user...')
  res.clearCookie('auth_token')
  res.json({ message: 'Sesión cerrada' })
})

router.get('/me', async (req, res) => {
  let token = req.cookies.auth_token
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1]
  }
  if (!token) return res.status(401).json({ error: 'No autorizado' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.id } })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const { password: _, ...userData } = user
    res.json(userData)
  } catch (e) {
    res.status(401).json({ error: 'Token inválido' })
  }
})

// User Management (Admin Only from Local Network)
router.get('/', authenticate, ipFilter, async (req, res) => {
  console.log('[AUTH] Fetching all users...')
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, name: true, username: true, role: true, avatar: true, 
        _count: { select: { attendances: true, absences: true } }
      }
    })
    console.log(`[AUTH] Successfully fetched ${users.length} users`)
    res.json(users)
  } catch (e) {
    console.error(`[AUTH] Error fetching users: ${e.message}`)
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

router.post('/register', async (req, res, next) => {
  try {
    const count = await prisma.user.count()
    if (count === 0) return next()
    authenticate(req, res, next)
  } catch (e) {
    authenticate(req, res, next)
  }
}, ipFilter, async (req, res) => {
  const { name, username, password, role, avatar, pPOS, pInventory, pSales, pService, pOrders, pCustomers, pSettings } = req.body
  console.log(`[AUTH] Registering new user: ${username} (${role})`)
  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { 
        name, username, password: hashedPassword, role, avatar: avatar || '👤', 
        pPOS: !!pPOS, pInventory: !!pInventory, pSales: !!pSales, 
        pService: !!pService, pOrders: !!pOrders, pCustomers: !!pCustomers, 
        pSettings: !!pSettings,
        cedula: req.body.cedula || '',
        phone: req.body.phone || '',
        photo: req.body.photo || '',
        address: req.body.address || '',
        gender: req.body.gender || '',
        birthday: req.body.birthday ? new Date(req.body.birthday) : null,
        salary: req.body.salary ? parseFloat(req.body.salary) : 0,
        hiredAt: req.body.hiredAt ? new Date(req.body.hiredAt) : new Date(),
        cvData: req.body.cvData || '',
        dataFile: req.body.dataFile || ''
      }
    })
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })
    const { password: _, ...userData } = user
    console.log(`[AUTH] User ${username} registered successfully`)
    res.status(201).json({ user: userData, token })
  } catch (e) {
    console.error(`[AUTH] Registration error for user ${username}: ${e.message}`)
    res.status(400).json({ error: 'Nombre de usuario ya existe o datos inválidos' })
  }
})

router.patch('/:id', authenticate, ipFilter, async (req, res) => {
  const { 
    name, username, password, role, avatar, 
    pPOS, pInventory, pSales, pService, pOrders, pCustomers, pSettings
  } = req.body
  console.log(`[AUTH] Updating user ID: ${req.params.id} (${username})`)
  try {
    const data = { 
      name, username, role, avatar, 
      pPOS, pInventory, pSales, pService, pOrders, pCustomers, pSettings,
      cedula: req.body.cedula,
      phone: req.body.phone,
      photo: req.body.photo,
      address: req.body.address,
      gender: req.body.gender,
      birthday: req.body.birthday ? new Date(req.body.birthday) : undefined,
      salary: req.body.salary ? parseFloat(req.body.salary) : undefined,
      hiredAt: req.body.hiredAt ? new Date(req.body.hiredAt) : undefined,
      cvData: req.body.cvData,
      dataFile: req.body.dataFile
    }
    if (password) {
      data.password = await bcrypt.hash(password, 10)
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data
    })
    const { password: _, ...userData } = user
    console.log(`[AUTH] User ${username} updated successfully`)
    res.json(userData)
  } catch (e) {
    console.error(`[AUTH] Error updating user ${req.params.id}: ${e.message}`)
    res.status(400).json({ error: 'Error al actualizar usuario' })
  }
})

// GET full employee detail
router.get('/:id', async (req, res) => {
  console.log(`[AUTH] Fetching details for user ID: ${req.params.id}`)
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        attendances: { orderBy: { checkIn: 'desc' }, take: 50 },
        absences: { orderBy: { date: 'desc' }, take: 50 }
      }
    })
    if (!user) {
      console.warn(`[AUTH] User ID: ${req.params.id} not found`)
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    const { password: _, ...userData } = user
    console.log(`[AUTH] Successfully fetched details for user ${user.username}`)
    res.json(userData)
  } catch (e) {
    console.error(`[AUTH] Error fetching user ${req.params.id} details: ${e.message}`)
    res.status(500).json({ error: 'Error al obtener detalles del empleado' })
  }
})

// Attendance & Absences
router.post('/:id/attendance', async (req, res) => {
  const { type, notes } = req.body // 'IN' or 'OUT'
  const date = new Date().toISOString().split('T')[0]
  console.log(`[AUTH] Registering ${type} attendance for user ID: ${req.params.id}`)
  try {
    if (type === 'IN') {
      const att = await prisma.attendance.create({
        data: { userId: req.params.id, date, notes }
      })
      console.log(`[AUTH] Attendance IN registered for user ${req.params.id}`)
      return res.json(att)
    } else {
      const last = await prisma.attendance.findFirst({
        where: { userId: req.params.id, date, checkOut: null },
        orderBy: { checkIn: 'desc' }
      })
      if (!last) {
        console.warn(`[AUTH] Attendance OUT failed: No open entry for user ${req.params.id}`)
        return res.status(400).json({ error: 'No hay entrada abierta hoy' })
      }
      const updated = await prisma.attendance.update({
        where: { id: last.id },
        data: { checkOut: new Date(), notes: notes || last.notes }
      })
      console.log(`[AUTH] Attendance OUT registered for user ${req.params.id}`)
      res.json(updated)
    }
  } catch (e) {
    console.error(`[AUTH] Attendance error for user ${req.params.id}: ${e.message}`)
    res.status(400).json({ error: 'Error al registrar asistencia' })
  }
})

router.post('/:id/absences', async (req, res) => {
  const { date, reason, isJustified } = req.body
  console.log(`[AUTH] Registering absence for user ID: ${req.params.id} on date: ${date}`)
  try {
    const abs = await prisma.absence.create({
      data: { userId: req.params.id, date, reason, isJustified: !!isJustified }
    })
    console.log(`[AUTH] Absence registered for user ${req.params.id}`)
    res.status(201).json(abs)
  } catch (e) {
    console.error(`[AUTH] Error registering absence for user ${req.params.id}: ${e.message}`)
    res.status(400).json({ error: 'Error al registrar falta' })
  }
})

router.delete('/:id', authenticate, ipFilter, async (req, res) => {
  console.log(`[AUTH] Deleting user ID: ${req.params.id}`)
  try {
    await prisma.user.delete({ where: { id: req.params.id } })
    console.log(`[AUTH] User ${req.params.id} deleted successfully`)
    res.status(204).send()
  } catch (e) {
    console.error(`[AUTH] Error deleting user ${req.params.id}: ${e.message}`)
    res.status(400).json({ error: 'Error al eliminar usuario' })
  }
})

export default router
