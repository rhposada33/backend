-- Add UI theme preference to users
CREATE TYPE "ThemePreference" AS ENUM ('DARK', 'LIGHT');

ALTER TABLE "users"
ADD COLUMN "theme" "ThemePreference" NOT NULL DEFAULT 'DARK';
