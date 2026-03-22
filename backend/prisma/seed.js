import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.saleItem.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.product.deleteMany()
  await prisma.user.deleteMany()

  // 1. Create Users
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const superPassword = await bcrypt.hash('super123', 10)
  const vendPassword = await bcrypt.hash('vend123', 10)

  await prisma.user.createMany({
    data: [
      { username: 'admin', password: hashedPassword, name: 'Carlos Admin', role: 'admin', avatar: '👨‍💼' },
      { username: 'supervisor', password: superPassword, name: 'Ana Supervisora', role: 'supervisor', avatar: '👩‍💼' },
      { username: 'vendedor', password: vendPassword, name: 'Pedro Vendedor', role: 'empleado', avatar: '🧑‍🔧' },
    ]
  })

  // 2. Create Products
  await prisma.product.createMany({
    data: [
      { sku: 'BAT-IP13', name: 'Batería Original iPhone 13', category: 'Repuestos', price: 45.0, cost: 22.0, stock: 12, minStock: 5, warehouse: 'Principal', image: '🔋', featured: true },
      { sku: 'SCR-S22U', name: 'Pantalla OLED Samsung S22 Ultra', category: 'Repuestos', price: 180.0, cost: 90.0, stock: 2, minStock: 3, warehouse: 'Principal', image: '📱', featured: true },
      { sku: 'CAB-USB-C', name: 'Cable USB-C a Lightning 1m', category: 'Accesorios', price: 15.0, cost: 5.0, stock: 45, minStock: 10, warehouse: 'Tienda', image: '🔌', featured: false },
      { sku: 'CHG-20W', name: 'Cargador Rápido 20W Apple', category: 'Accesorios', price: 25.0, cost: 10.0, stock: 28, minStock: 8, warehouse: 'Tienda', image: '🔌', featured: true },
      { sku: 'TPG-IP14', name: 'Templado Premium iPhone 14', category: 'Accesorios', price: 8.0, cost: 2.0, stock: 3, minStock: 10, warehouse: 'Tienda', image: '🛡️', featured: false },
    ]
  })

  console.log('✅ Base de datos sembrada con éxito')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
