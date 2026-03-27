import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()

// The frontend calls /api/loyalty/rewards
// index.js uses app.use('/api/loyalty/rewards', loyaltyRoutes)
// So we use router.get('/') for base rewards list

// Get all rewards
router.get('/rewards', async (req, res) => {
  console.log('[LOYALTY] Fetching all rewards...')
  try {
    const rewards = await prisma.loyaltyReward.findMany({
      orderBy: { pointsCost: 'asc' }
    })
    console.log(`[LOYALTY] Successfully fetched ${rewards.length} rewards`)
    res.json(rewards)
  } catch (e) {
    console.error(`[LOYALTY] Error fetching rewards: ${e.message}`)
    res.status(500).json({ error: 'Error al obtener recompensas' })
  }
})

// Create reward
router.post('/rewards', async (req, res) => {
  const { name, pointsCost } = req.body
  console.log(`[LOYALTY] Creating reward: ${name} (Points: ${pointsCost})`)
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
    console.log(`[LOYALTY] Reward created successfully: ${reward.id}`)
    res.status(201).json(reward)
  } catch (e) {
    console.error(`[LOYALTY] Error creating reward: ${e.message}`)
    res.status(400).json({ error: 'Error al crear recompensa' })
  }
})

// Update reward
router.patch('/rewards/:id', async (req, res) => {
  console.log(`[LOYALTY] Updating reward ID: ${req.params.id}`)
  try {
    const reward = await prisma.loyaltyReward.update({
      where: { id: req.params.id },
      data: req.body
    })
    console.log(`[LOYALTY] Reward ${req.params.id} updated successfully`)
    res.json(reward)
  } catch (e) {
    console.error(`[LOYALTY] Error updating reward ${req.params.id}: ${e.message}`)
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
  console.log(`[LOYALTY] Redeeming reward ID: ${rewardId} for customer ID: ${customerId}`)
  try {
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } })
      const reward = await tx.loyaltyReward.findUnique({ where: { id: rewardId } })
      
      if (!customer || !reward) {
        console.warn(`[LOYALTY] Redeem failed: Customer ${customerId} or Reward ${rewardId} not found`)
        throw new Error('Cliente o recompensa no encontrados')
      }
      if (customer.points < reward.pointsCost) {
        console.warn(`[LOYALTY] Redeem failed: Customer ${customerId} has insufficient points (${customer.points}/${reward.pointsCost})`)
        throw new Error('Puntos insuficientes')
      }
      
      const newCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          points: { decrement: reward.pointsCost },
          pendingDiscount: (reward.type === 'DISCOUNT' || reward.type === 'COUPON') && reward.value ? reward.value : 0
        }
      })

      await tx.loyaltyMovement.create({
        data: {
          customerId,
          points: -reward.pointsCost,
          type: 'REDEEMED',
          reason: `Canje: ${reward.name}`
        }
      })
      return newCustomer
    })
    const { password: _, ...cData } = result
    console.log(`[LOYALTY] Reward ${rewardId} redeemed successfully for customer ${customerId}`)
    res.json(cData)
  } catch (e) {
    console.error(`[LOYALTY] Error redeeming reward: ${e.message}`)
    res.status(400).json({ error: e.message || 'Error al canjear recompensa' })
  }
})

export default router
