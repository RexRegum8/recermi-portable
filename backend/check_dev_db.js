import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
})

async function check() {
  try {
    const users = await prisma.user.findMany()
    console.log('USERS_IN_DEV_DB:', users.length)
    if (users.length > 0) {
      console.log('SAMPLE_USER:', users[0].username)
    }
  } catch (e) {
    console.error('Error reading dev.db:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

check()
