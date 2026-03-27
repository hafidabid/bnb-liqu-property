-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "legalNotaryName" TEXT,
ADD COLUMN     "prospectusMarkdown" TEXT,
ADD COLUMN     "salePeriodEnd" TIMESTAMP(3),
ADD COLUMN     "salePeriodStart" TIMESTAMP(3),
ADD COLUMN     "targetFundUSD" DOUBLE PRECISION;
