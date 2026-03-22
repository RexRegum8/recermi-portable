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
      select: { id: true, name: true, username: true, role: true, avatar: true }
    })
    res.json(users)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

router.post('/register', async (req, res) => {
  const { name, username, password, role, avatar, pPOS, pInventory, pSales, pService, pOrders, pSettings } = req.body
  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, username, password: hashedPassword, role, avatar, pPOS, pInventory, pSales, pService, pOrders, pSettings }
    })
    const { password: _, ...userData } = user
    res.status(201).json(userData)
  } catch (e) {
    res.status(400).json({ error: 'Nombre de usuario ya existe o datos inválidos' })
  }
})

router.patch('/:id', async (req, res) => {
  const { name, username, password, role, avatar, pPOS, pInventory, pSales, pService, pOrders, pSettings } = req.body
  try {
    const data = { name, username, role, avatar, pPOS, pInventory, pSales, pService, pOrders, pSettings }
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

router.delete('/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (e) {
    res.status(400).json({ error: 'Error al eliminar usuario' })
  }
})

export default router
