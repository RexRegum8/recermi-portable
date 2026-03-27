import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient({ datasources: { db: { url: 'file:C:/Users/jdlva/AppData/Roaming/rexermi-os/rexermi.db' } } })

async function main() {
  const products = await prisma.product.findMany({ select: { id: true, name: true, image: true } })
  console.log(JSON.stringify(products, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
