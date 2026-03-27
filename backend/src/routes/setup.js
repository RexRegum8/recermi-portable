import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()

// Check database status and validity
router.get('/verify-db', async (req, res) => {
  try {
    // 1. Check if we can connect and if tables exist
    // Simple check: count users
    const userCount = await prisma.user.count()
    
    // 2. Check for latest schema changes (e.g. Loyalty table)
    let isOutdated = false;
    try {
      await prisma.loyaltyReward.count();
    } catch (e) {
      console.warn('[SETUP] LoyaltyReward table missing. DB might be outdated.');
      isOutdated = true;
    }
    
    const needsAdmin = userCount === 0
    
    res.json({ 
      valid: true, 
      needsAdmin,
      isOutdated,
      message: 'Database connection successful' 
    })
  } catch (e) {
    console.error('[SETUP] DB Verification failed:', e)
    res.status(500).json({ 
      valid: false, 
      error: 'Invalid database or connection failed',
      details: e.message 
    })
  }
})

export default router
