-- CreateTable
CREATE TABLE "Closure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSales" INTEGER NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "totalAmountUsd" REAL NOT NULL,
    "totalAmountBs" REAL NOT NULL,
    "ivaTotal" REAL NOT NULL,
    "details" TEXT NOT NULL,
    "cashier" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "cost" REAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 5,
    "warehouse" TEXT NOT NULL DEFAULT 'Principal',
    "image" TEXT NOT NULL DEFAULT '📦',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "showInCatalog" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("category", "cost", "description", "featured", "id", "image", "minStock", "name", "price", "sku", "stock", "updatedAt", "warehouse") SELECT "category", "cost", "description", "featured", "id", "image", "minStock", "name", "price", "sku", "stock", "updatedAt", "warehouse" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
