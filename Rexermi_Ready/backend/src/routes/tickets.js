import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()
// const prisma = new PrismaClient() // removed

// List all tickets
router.get('/', async (req, res) => {
  try {
    const tickets = await prisma.serviceTicket.findMany({
      include: { notes: true },
      orderBy: { date: 'desc' } // Changed from createdAt to date as per schema
    })
    try {
      res.json(tickets)
    } catch (sendError) {
      console.error('SERIALIZATION ERROR in /api/tickets:', sendError)
      res.status(500).json({ error: 'Error serializando tickets' })
    }
  } catch (e) {
    console.error('ERROR GET /api/tickets:', e)
    res.status(500).json({ error: 'Error al obtener tickets' })
  }
})

// Create ticket
router.post('/', async (req, res) => {
  const { customer, phone, device, serial, issue, author } = req.body
  try {
    // Generate TK number
    const count = await prisma.serviceTicket.count()
    const tkNumber = `TK-${(count + 1).toString().padStart(3, '0')}`

    const ticket = await prisma.serviceTicket.create({
      data: {
        tkNumber,
        customer, phone, device, serial, issue,
        status: 'ENTRY',
        notes: {
          create: { content: `[Sistema] Creado por ${author}`, author }
        }
      },
      include: { notes: true }
    })
    res.status(201).json(ticket)
  } catch (e) {
    console.error(e)
    res.status(400).json({ error: 'Error al crear ticket' })
  }
})

// Update ticket
router.patch('/:id', async (req, res) => {
  const { status, diagnosis, cost, warranty, parts } = req.body
  try {
    const ticket = await prisma.serviceTicket.update({
      where: { id: req.params.id },
      data: { status, diagnosis, cost, warranty, parts },
      include: { notes: true }
    })
    res.json(ticket)
  } catch (e) {
    res.status(400).json({ error: 'Error al actualizar ticket' })
  }
})

// Add note to ticket
router.post('/:id/notes', async (req, res) => {
  const { content, author } = req.body
  try {
    const note = await prisma.serviceNote.create({
      data: {
        content, author,
        ticket: { connect: { id: req.params.id } }
      }
    })
    res.status(201).json(note)
  } catch (e) {
    res.status(400).json({ error: 'Error al agregar nota' })
  }
})

export default router
