-- A shared colour library, so a colour is picked from a list instead of typed freely.
CREATE TABLE "color_options" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "color_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "color_options_name_key" ON "color_options"("name");

-- Starter set of clothing colours; safe to re-run because the name is unique.
INSERT INTO "color_options" ("id", "name", "hex") VALUES
  ('color-black',  'أسود',    '#111827'),
  ('color-white',  'أبيض',    '#F8FAFC'),
  ('color-red',    'أحمر',    '#DC2626'),
  ('color-blue',   'أزرق',    '#2563EB'),
  ('color-navy',   'كحلي',    '#1E3A8A'),
  ('color-sky',    'سماوي',   '#38BDF8'),
  ('color-green',  'أخضر',    '#16A34A'),
  ('color-yellow', 'أصفر',    '#EAB308'),
  ('color-orange', 'برتقالي', '#F97316'),
  ('color-pink',   'وردي',    '#EC4899'),
  ('color-purple', 'بنفسجي',  '#7C3AED'),
  ('color-brown',  'بني',     '#92400E'),
  ('color-beige',  'بيج',     '#D6C7A1'),
  ('color-gray',   'رمادي',   '#6B7280'),
  ('color-gold',   'ذهبي',    '#D4AF37'),
  ('color-silver', 'فضي',     '#9CA3AF')
ON CONFLICT ("name") DO NOTHING;
