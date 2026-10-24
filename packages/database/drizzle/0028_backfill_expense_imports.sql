-- Gastos imported from a file before Importações existed: each import was one insert, so its
-- lines share their created_at. Give each such batch an Importação, so it can be edited or deleted.
INSERT INTO "expense_import" ("file_name", "holder_id", "organization_id", "source", "created_at", "updated_at")
SELECT 'Planilha importada', "holder_id", "organization_id", 'CSV', "created_at", "created_at"
FROM "expense"
WHERE "imported" AND "bank_link_id" IS NULL AND "import_id" IS NULL
GROUP BY "holder_id", "organization_id", "created_at";
--> statement-breakpoint
UPDATE "expense" AS e
SET "import_id" = i."id"
FROM "expense_import" AS i
WHERE e."imported" AND e."bank_link_id" IS NULL AND e."import_id" IS NULL
  AND i."holder_id" = e."holder_id" AND i."created_at" = e."created_at"
  AND i."file_name" = 'Planilha importada';
