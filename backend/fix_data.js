import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Fix reward
  await prisma.loyaltyReward.updateMany({
    where: { name: 'gfhg' },
    data: {
      type: 'COUPON',
      value: 10,
      description: 'Cupón de prueba del 10%'
    }
  })
  
  // Create another good reward
  await prisma.loyaltyReward.upsert({
    where: { id: 'test-coupon-50' },
    update: {},
    create: {
      id: 'test-coupon-50',
      name: 'Cupón Platino',
      description: '50% de descuento en tu compra',
      pointsCost: 50,
      type: 'COUPON',
      value: 50,
      isActive: true
    }
  })

  // Give points to the customer
  await prisma.customer.updateMany({
    where: { email: 'rexor@gmail.com' },
    data: { points: 1000 }
  })

  console.log('✅ Datos reparados: gfhg ahora es 10% y rexor tiene 1000 puntos.')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
