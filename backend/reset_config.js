import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  await prisma.systemConfig.update({
    where: { id: 1 },
    data: {
      pPriceBond: 0.20,
      pPricePhoto: 1.50,
      pPriceGlace: 2.00,
      pPriceColorMult: 2.5,
      pPriceBWMult: 1.0,
      pPriceSimpleMult: 1.0,
      pPriceDoubleMult: 1.8
    }
  })
  console.log("Config updated successfully")
}
main().catch(console.error).finally(() => prisma.$disconnect())
