-- Colours carry an English name so the interface can show both languages.
ALTER TABLE "color_options" ADD COLUMN "nameEn" TEXT;

UPDATE "color_options" SET "nameEn" = CASE "name"
  WHEN 'أسود'    THEN 'Black'
  WHEN 'أبيض'    THEN 'White'
  WHEN 'أحمر'    THEN 'Red'
  WHEN 'أزرق'    THEN 'Blue'
  WHEN 'كحلي'    THEN 'Navy'
  WHEN 'سماوي'   THEN 'Sky blue'
  WHEN 'أخضر'    THEN 'Green'
  WHEN 'أصفر'    THEN 'Yellow'
  WHEN 'برتقالي' THEN 'Orange'
  WHEN 'وردي'    THEN 'Pink'
  WHEN 'بنفسجي'  THEN 'Purple'
  WHEN 'بني'     THEN 'Brown'
  WHEN 'بيج'     THEN 'Beige'
  WHEN 'رمادي'   THEN 'Gray'
  WHEN 'ذهبي'    THEN 'Gold'
  WHEN 'فضي'     THEN 'Silver'
  ELSE NULL
END;
