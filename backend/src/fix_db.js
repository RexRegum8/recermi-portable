import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const result = await prisma.product.updateMany({
    where: { name: 'prueba' },
    data: { image: '📦' }
  })
  console.log(`Updated ${result.count} products.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
