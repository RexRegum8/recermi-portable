import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  console.log('Last 5 Sales:', JSON.stringify(sales, null, 2))
  
  const today = new Date().toISOString().split('T')[0]
  console.log('Searching for date:', today)
  
  const todaySales = await prisma.sale.findMany({
    where: { date: today }
  })
  console.log('Today Sales count:', todaySales.length)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
