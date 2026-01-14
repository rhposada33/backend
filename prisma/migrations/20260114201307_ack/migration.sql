-- AlterTable
ALTER TABLE "events" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'unresolved';
