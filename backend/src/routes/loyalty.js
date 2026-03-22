import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()

// The frontend calls /api/loyalty/rewards
// index.js uses app.use('/api/loyalty/rewards', loyaltyRoutes)
// So we use router.get('/') for base rewards list

// Get all rewards
router.get('/rewards', async (req, res) => {
  try {
    const rewards = await prisma.loyaltyReward.findMany({
      orderBy: { pointsCost: 'asc' }
    })
    res.json(rewards)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener recompensas' })
  }
})

// Create reward
router.post('/rewards', async (req, res) => {
  try {
    const { name, description, pointsCost, isActive, type, value, showInCatalog } = req.body
    const reward = await prisma.loyaltyReward.create({ 
      data: { 
        name, 
        description, 
        pointsCost: Number(pointsCost), 
        isActive: isActive ?? true,
        type: type || 'PRODUCT',
        value: value || 0,
        showInCatalog: showInCatalog ?? true
      } 
    })
    res.status(201).json(reward)
  } catch (e) {
    console.error(e)
    res.status(400).json({ error: 'Error al crear recompensa' })
  }
})

// Update reward
router.patch('/rewards/:id', async (req, res) => {
  try {
    const reward = await prisma.loyaltyReward.update({
      where: { id: req.params.id },
      data: req.body
    })
    res.json(reward)
  } catch (e) {
    res.status(400).json({ error: 'Error al actualizar recompensa' })
  }
})

// Delete reward
router.delete('/rewards/:id', async (req, res) => {
  try {
    await prisma.loyaltyReward.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar recompensa' })
  }
})

// REDEEM REWARD
router.post('/redeem', async (req, res) => {
  const { customerId, rewardId } = req.body
  try {
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } })
      const reward = await tx.loyaltyReward.findUnique({ where: { id: rewardId } })
      
      if (!customer || !reward) throw new Error('Cliente o recompensa no encontrados')
      if (customer.points < reward.pointsCost) throw new Error('Puntos insuficientes')
      
      const newCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          points: { decrement: reward.pointsCost },
          pendingDiscount: reward.type === 'DISCOUNT' && reward.value ? reward.value : 0
        }
      })
      return newCustomer
    })
    const { password: _, ...cData } = result
    res.json(cData)
  } catch (e) {
    console.error(e)
    res.status(400).json({ error: e.message || 'Error al canjear recompensa' })
  }
})

export default router
