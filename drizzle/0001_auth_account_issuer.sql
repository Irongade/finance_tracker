ALTER TABLE "auth_account" ADD COLUMN "issuer" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_account_issuer_account_idx" ON "auth_account" USING btree ("issuer","account_id");