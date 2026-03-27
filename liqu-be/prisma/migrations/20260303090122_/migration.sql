-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "thumbnailDocumentId" TEXT;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_thumbnailDocumentId_fkey" FOREIGN KEY ("thumbnailDocumentId") REFERENCES "PropertyDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
