CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE,
  patient_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  diagnosis TEXT,
  last_visit_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS diagnosis TEXT;

CREATE TABLE IF NOT EXISTS allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  is_critical BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, code)
);

ALTER TABLE allergies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'allergies_patient_id_code_key'
  ) THEN
    ALTER TABLE allergies
      ADD CONSTRAINT allergies_patient_id_code_key UNIQUE (patient_id, code);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS visit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  visit_date DATE NOT NULL,
  clinic_code TEXT NOT NULL,
  doctor_notes TEXT,
  diagnosis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allergies_patient ON allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_visit_history_patient ON visit_history(patient_id);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id UUID PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);