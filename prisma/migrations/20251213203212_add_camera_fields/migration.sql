/*
  Warnings:

  - You are about to drop the column `key` on the `cameras` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenantId,frigateCameraKey]` on the table `cameras` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `frigateCameraKey` to the `cameras` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "cameras_tenantId_key_key";

-- AlterTable
-- Safely rename 'key' column to 'frigateCameraKey' to preserve existing data
ALTER TABLE "cameras" 
  RENAME COLUMN "key" TO "frigateCameraKey";

-- Add the new 'isEnabled' column with default value
ALTER TABLE "cameras" 
  ADD COLUMN "isEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "cameras_tenantId_frigateCameraKey_key" ON "cameras"("tenantId", "frigateCameraKey");
