-- Change tokenPrice and baselinePrice from Float to Decimal(36,18) for full precision
ALTER TABLE "PriceSnapshot" ALTER COLUMN "tokenPrice" TYPE DECIMAL(36,18);
ALTER TABLE "PriceSnapshot" ALTER COLUMN "baselinePrice" TYPE DECIMAL(36,18);

-- Remove duplicate rows before adding unique constraint (keep one per propertyId+chainId+blockNumber, prefer latest id)
DELETE FROM "PriceSnapshot"
WHERE id NOT IN (
  SELECT DISTINCT ON ("propertyId", "chainId", "blockNumber") id
  FROM "PriceSnapshot"
  ORDER BY "propertyId", "chainId", "blockNumber", id DESC
);

-- Add unique constraint to prevent duplicate snapshots at the same block
CREATE UNIQUE INDEX "PriceSnapshot_propertyId_chainId_blockNumber_key"
  ON "PriceSnapshot"("propertyId", "chainId", "blockNumber");
