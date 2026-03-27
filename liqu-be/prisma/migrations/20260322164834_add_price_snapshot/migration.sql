-- CreateEnum
CREATE TYPE "SnapshotSource" AS ENUM ('INIT', 'CRON', 'YIELD');

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tokenId" BIGINT NOT NULL,
    "chainId" TEXT NOT NULL,
    "tokenPrice" DOUBLE PRECISION NOT NULL,
    "baselinePrice" DOUBLE PRECISION NOT NULL,
    "blockNumber" BIGINT,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "SnapshotSource" NOT NULL DEFAULT 'CRON',

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" SERIAL NOT NULL,
    "chainId" TEXT NOT NULL,
    "lastSyncedBlock" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceSnapshot_propertyId_idx" ON "PriceSnapshot"("propertyId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_tokenId_chainId_idx" ON "PriceSnapshot"("tokenId", "chainId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncState_chainId_key" ON "SyncState"("chainId");

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
