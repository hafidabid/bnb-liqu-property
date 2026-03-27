-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'REGISTERED', 'TOKENIZED', 'LISTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('IMAGE', 'LEGAL_TITLE', 'LEGAL_REGISTRATION', 'PROSPECTUS', 'REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('MONTHLY', 'YIELD_PERCENTAGE');

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "tokenId" BIGINT,
    "metadataURI" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "propertyType" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "totalAreaSqm" DOUBLE PRECISION,
    "legalEntityName" TEXT,
    "legalRegistrationId" TEXT,
    "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyDocument" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertySLA" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "yieldPeriodDays" INTEGER NOT NULL,
    "reportPeriodDays" INTEGER NOT NULL,
    "holderYieldBPS" INTEGER NOT NULL,
    "baselineYieldBPS" INTEGER NOT NULL,
    "nextReportDueAt" TIMESTAMP(3),
    "nextYieldDueAt" TIMESTAMP(3),

    CONSTRAINT "PropertySLA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YieldDistribution" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tokenId" BIGINT NOT NULL,
    "totalAmount" DECIMAL(36,18) NOT NULL,
    "holderAmount" DECIMAL(36,18) NOT NULL,
    "baselineAmount" DECIMAL(36,18) NOT NULL,
    "platformFee" DECIMAL(36,18) NOT NULL,
    "txHash" TEXT,
    "distributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YieldDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyReport" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "reportPeriodStart" TIMESTAMP(3) NOT NULL,
    "reportPeriodEnd" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "documents" TEXT[],
    "onChainTxHash" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSubscription" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "activeUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Property_ownerAddress_idx" ON "Property"("ownerAddress");

-- CreateIndex
CREATE INDEX "Property_tokenId_idx" ON "Property"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertySLA_propertyId_key" ON "PropertySLA"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSubscription_propertyId_key" ON "PlatformSubscription"("propertyId");

-- AddForeignKey
ALTER TABLE "PropertyDocument" ADD CONSTRAINT "PropertyDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertySLA" ADD CONSTRAINT "PropertySLA_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YieldDistribution" ADD CONSTRAINT "YieldDistribution_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyReport" ADD CONSTRAINT "PropertyReport_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformSubscription" ADD CONSTRAINT "PlatformSubscription_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
