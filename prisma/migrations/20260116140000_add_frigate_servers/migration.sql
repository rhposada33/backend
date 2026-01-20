CREATE TABLE "public"."frigate_servers" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "name" text NOT NULL,
  "baseUrl" text NOT NULL,
  "authType" text NOT NULL DEFAULT 'none',
  "username" text NULL,
  "password" text NULL,
  "token" text NULL,
  "verifyTls" boolean NOT NULL DEFAULT true,
  "isEnabled" boolean NOT NULL DEFAULT true,
  "isDefault" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  CONSTRAINT "frigate_servers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "frigate_servers_tenantId_name_key" ON "public"."frigate_servers"("tenantId", "name");
CREATE INDEX "frigate_servers_tenantId_idx" ON "public"."frigate_servers"("tenantId");

ALTER TABLE "public"."frigate_servers"
  ADD CONSTRAINT "frigate_servers_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
