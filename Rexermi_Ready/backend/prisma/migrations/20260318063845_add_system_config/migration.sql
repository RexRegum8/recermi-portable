-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "storeName" TEXT NOT NULL DEFAULT 'Rexermi Tech',
    "storeRIF" TEXT NOT NULL DEFAULT 'J-12345678-9',
    "storeAddress" TEXT NOT NULL DEFAULT 'Av. Principal, Centro Comercial Plaza, Local 12',
    "storePhone" TEXT NOT NULL DEFAULT '0414-1234567',
    "exchangeRateBCV" REAL NOT NULL DEFAULT 36.50,
    "exchangeRateUSDT" REAL NOT NULL DEFAULT 37.20,
    "ivaPercent" REAL NOT NULL DEFAULT 16,
    "updatedAt" DATETIME NOT NULL
);
