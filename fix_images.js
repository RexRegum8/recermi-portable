import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient({ datasources: { db: { url: 'file:C:/Users/jdlva/AppData/Roaming/rexermi-os/rexermi.db' } } })

async function main() {
  console.log('Fixing corrupted images...')
  const result = await prisma.product.updateMany({
    where: { name: 'prueba' },
    data: { image: '📦' }
  })
  console.log(`Updated ${result.count} products.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
