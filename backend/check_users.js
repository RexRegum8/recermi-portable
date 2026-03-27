import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:C:/Rexermi-win32-x64/resources/app/backend/prisma/dev.db'
    }
  }
})
async function main() {
  const users = await prisma.user.findMany()
  console.log('--- USERS IN DB ---')
  users.forEach(u => console.log(`- ${u.name} (${u.username}) [${u.role}]`))
  console.log('-------------------')
}
main().catch(console.error).finally(() => prisma.$disconnect())
