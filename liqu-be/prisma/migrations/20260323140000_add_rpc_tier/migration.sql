-- CreateEnum
CREATE TYPE "RpcTier" AS ENUM ('FREE', 'PAID');

-- AlterTable
ALTER TABLE "Rpc" ADD COLUMN "tier" "RpcTier" NOT NULL DEFAULT 'FREE';
