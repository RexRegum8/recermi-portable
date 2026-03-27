import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const UPLOADS_BASE = path.join(__dirname, '..', 'src', 'uploads');
const PRODUCTS_DIR = path.join(UPLOADS_BASE, 'products');
const SYSTEM_DIR = path.join(UPLOADS_BASE, 'system');

// Ensure directories exist
[PRODUCTS_DIR, SYSTEM_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function saveBase64Image(base64Data, targetDir, prefix) {
  if (!base64Data || !base64Data.startsWith('data:image')) return null;

  try {
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const extension = matches[1].split('/')[1] === 'jpeg' ? 'jpg' : matches[1].split('/')[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    const filePath = path.join(targetDir, fileName);

    fs.writeFileSync(filePath, buffer);
    
    // Return the relative URL from the backend perspective
    // Assuming the backend serves /uploads from src/uploads
    const relativeDir = targetDir.split(path.sep).pop(); // 'products' or 'system'
    return `/uploads/${relativeDir}/${fileName}`;
  } catch (e) {
    console.error('Error saving image:', e);
    return null;
  }
}

async function migrate() {
  console.log('🚀 Starting image migration...');

  // 1. Products
  const products = await prisma.product.findMany();
  console.log(`📦 Processing ${products.length} products...`);
  for (const p of products) {
    if (p.image && p.image.startsWith('data:image')) {
      const newPath = saveBase64Image(p.image, PRODUCTS_DIR, `prod_${p.id}`);
      if (newPath) {
        await prisma.product.update({
          where: { id: p.id },
          data: { image: newPath }
        });
        console.log(`✅ Product ${p.sku} migrated.`);
      }
    }
  }

  // 2. SystemConfig
  const config = await prisma.systemConfig.findFirst();
  if (config && config.companyLogo && config.companyLogo.startsWith('data:image')) {
    console.log('配置 System Logo processing...');
    const newPath = saveBase64Image(config.companyLogo, SYSTEM_DIR, 'logo');
    if (newPath) {
      await prisma.systemConfig.update({
        where: { id: config.id },
        data: { companyLogo: newPath }
      });
      console.log('✅ System Logo migrated.');
    }
  }

  // 3. User Photos
  const users = await prisma.user.findMany();
  for (const u of users) {
    if (u.photo && u.photo.startsWith('data:image')) {
      const newPath = saveBase64Image(u.photo, SYSTEM_DIR, `user_${u.id}`);
      if (newPath) {
        await prisma.user.update({
          where: { id: u.id },
          data: { photo: newPath }
        });
        console.log(`✅ User ${u.username} photo migrated.`);
      }
    }
  }

  // 4. Sale Proofs
  const sales = await prisma.sale.findMany({ where: { paymentProof: { startsWith: 'data:image' } } });
  for (const s of sales) {
    const newPath = saveBase64Image(s.paymentProof, SYSTEM_DIR, `sale_${s.id}`);
    if (newPath) {
      await prisma.sale.update({
        where: { id: s.id },
        data: { paymentProof: newPath }
      });
      console.log(`✅ Sale ${s.saleNumber} proof migrated.`);
    }
  }

  console.log('✨ Migration finished!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
