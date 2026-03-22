import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    const ticketCount = await prisma.serviceTicket.count()
    console.log('Ticket count:', ticketCount)
    const tickets = await prisma.serviceTicket.findMany({
      include: { notes: true },
      take: 1
    })
    console.log('Sample ticket with notes:', JSON.stringify(tickets, null, 2))
  } catch (e) {
    console.error('ERROR in ServiceTicket query:', e.message)
    console.error(e)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
