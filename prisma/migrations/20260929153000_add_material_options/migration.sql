-- A shared material library so a material is picked from a list instead of typed.
CREATE TABLE "material_options" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "material_options_name_key" ON "material_options"("name");

INSERT INTO "material_options" ("id", "name") VALUES
  ('material-cotton',   'قطن'),
  ('material-leather',  'جلد'),
  ('material-linen',    'كتان'),
  ('material-melton',   'ملتون'),
  ('material-velvet',   'قطيفة')
ON CONFLICT ("name") DO NOTHING;
