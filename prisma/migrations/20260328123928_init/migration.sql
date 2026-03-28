-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "originalPrice" REAL NOT NULL,
    "salePrice" REAL NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "finalUrl" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClickLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "referer" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClickLog_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Deal_slug_key" ON "Deal"("slug");

-- CreateIndex
CREATE INDEX "ClickLog_dealId_idx" ON "ClickLog"("dealId");
