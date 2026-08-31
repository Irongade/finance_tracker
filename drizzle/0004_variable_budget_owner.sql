DROP INDEX "variable_budgets_category_idx";--> statement-breakpoint
ALTER TABLE "variable_budgets" ADD COLUMN "owner" "owner_kind" DEFAULT 'joint' NOT NULL;--> statement-breakpoint
ALTER TABLE "variable_budgets" ADD COLUMN "owner_member_id" uuid;--> statement-breakpoint
ALTER TABLE "variable_budgets" ADD CONSTRAINT "variable_budgets_owner_member_id_household_members_id_fk" FOREIGN KEY ("owner_member_id") REFERENCES "public"."household_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "variable_budgets_joint_idx" ON "variable_budgets" USING btree ("category_id") WHERE "variable_budgets"."owner" = 'joint';--> statement-breakpoint
CREATE UNIQUE INDEX "variable_budgets_member_idx" ON "variable_budgets" USING btree ("category_id","owner_member_id") WHERE "variable_budgets"."owner" = 'user';--> statement-breakpoint
ALTER TABLE "variable_budgets" ADD CONSTRAINT "variable_budgets_owner_check" CHECK (("variable_budgets"."owner" = 'joint' and "variable_budgets"."owner_member_id" is null) or ("variable_budgets"."owner" = 'user' and "variable_budgets"."owner_member_id" is not null));