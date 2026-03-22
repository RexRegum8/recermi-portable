import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, email: true, points: true, pendingDiscount: true }
  })
  const rewards = await prisma.loyaltyReward.findMany()
  
  console.log('--- CUSTOMERS ---')
  console.table(customers)
  console.log('--- REWARDS ---')
  console.table(rewards)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
