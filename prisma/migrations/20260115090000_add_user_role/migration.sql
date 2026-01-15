-- Add roles to users and backfill from legacy isAdmin
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CLIENT');

ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'CLIENT';

UPDATE "users" SET "role" = 'ADMIN' WHERE "isAdmin" = true;

ALTER TABLE "users" DROP COLUMN "isAdmin";
