-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_chainId_fkey";

-- DropForeignKey
ALTER TABLE "Rpc" DROP CONSTRAINT "Rpc_chainId_fkey";

-- DropForeignKey
ALTER TABLE "SystemAccount" DROP CONSTRAINT "SystemAccount_chainId_fkey";

-- AlterTable
ALTER TABLE "Chain" ALTER COLUMN "chainId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Contract" ALTER COLUMN "chainId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Rpc" ALTER COLUMN "chainId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "SystemAccount" ALTER COLUMN "chainId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "Rpc" ADD CONSTRAINT "Rpc_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Chain"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Chain"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAccount" ADD CONSTRAINT "SystemAccount_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Chain"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;
