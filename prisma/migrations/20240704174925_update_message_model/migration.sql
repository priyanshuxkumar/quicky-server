-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "mediaUrl" TEXT,
ALTER COLUMN "content" DROP NOT NULL;
