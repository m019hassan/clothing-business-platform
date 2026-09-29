-- A shared size library so a size is picked from a list and carries its age.
CREATE TABLE "size_options" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ageLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "size_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "size_options_label_key" ON "size_options"("label");

-- Starter set: 5 to 30, each with the age it fits.
INSERT INTO "size_options" ("id", "label", "ageLabel") VALUES
  ('size-5', '5', '4–5 سنة'),
  ('size-6', '6', '5–6 سنة'),
  ('size-7', '7', '6–7 سنة'),
  ('size-8', '8', '7–8 سنة'),
  ('size-9', '9', '8–9 سنة'),
  ('size-10', '10', '9–10 سنة'),
  ('size-11', '11', '10–11 سنة'),
  ('size-12', '12', '11–12 سنة'),
  ('size-13', '13', '12–13 سنة'),
  ('size-14', '14', '13–14 سنة'),
  ('size-15', '15', '14–15 سنة'),
  ('size-16', '16', '15–16 سنة'),
  ('size-17', '17', '16–17 سنة'),
  ('size-18', '18', '17–18 سنة'),
  ('size-19', '19', '18–19 سنة'),
  ('size-20', '20', '19–20 سنة'),
  ('size-21', '21', '20–21 سنة'),
  ('size-22', '22', '21–22 سنة'),
  ('size-23', '23', '22–23 سنة'),
  ('size-24', '24', '23–24 سنة'),
  ('size-25', '25', '24–25 سنة'),
  ('size-26', '26', '25–26 سنة'),
  ('size-27', '27', '26–27 سنة'),
  ('size-28', '28', '27–28 سنة'),
  ('size-29', '29', '28–29 سنة'),
  ('size-30', '30', '29–30 سنة')
ON CONFLICT ("label") DO NOTHING;
