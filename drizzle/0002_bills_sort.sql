ALTER TABLE "bills" ADD COLUMN "sort" integer DEFAULT 0 NOT NULL;
-- backfill: keep the existing visual order (creation order) as the starting sort
UPDATE "bills" SET "sort" = sub.rn FROM (
  SELECT id, row_number() OVER (PARTITION BY household_id ORDER BY created_at) AS rn FROM "bills"
) sub WHERE "bills".id = sub.id;
