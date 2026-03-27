-- CreateTable
CREATE TABLE "UserTokenCache" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tokenId" BIGINT NOT NULL,
    "chainId" TEXT NOT NULL,
    "balance" TEXT NOT NULL,
    "balanceFormatted" DECIMAL(36,18) NOT NULL,
    "currentPrice" DECIMAL(36,18) NOT NULL,
    "pendingYield" DECIMAL(36,18) NOT NULL,
    "currentValue" DECIMAL(36,18) NOT NULL,
    "propertyName" TEXT NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "propertyStatus" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTokenCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTokenCache_walletAddress_propertyId_chainId_key" ON "UserTokenCache"("walletAddress", "propertyId", "chainId");

-- CreateIndex
CREATE INDEX "UserTokenCache_walletAddress_chainId_idx" ON "UserTokenCache"("walletAddress", "chainId");

-- CreateIndex
CREATE INDEX "UserTokenCache_propertyId_idx" ON "UserTokenCache"("propertyId");

-- AddForeignKey
ALTER TABLE "UserTokenCache" ADD CONSTRAINT "UserTokenCache_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
