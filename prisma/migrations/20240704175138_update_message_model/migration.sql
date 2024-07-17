/*
  Warnings:

  - You are about to drop the column `mediaUrl` on the `Message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Message" DROP COLUMN "mediaUrl",
ADD COLUMN     "shareMediaUrl" TEXT;
