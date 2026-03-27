import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const order = await prisma.printOrder.findFirst({ where: { orderNumber: 'PRNT-0005' } })
  console.log(JSON.stringify(order, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
