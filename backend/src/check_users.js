import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    const users = await prisma.user.findMany()
    console.log('USERS_IN_DB:', JSON.stringify(users, null, 2))
    const count = await prisma.user.count()
    console.log('COUNT:', count)
  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
