CREATE TABLE IF NOT EXISTS pricing_rule_overrides (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  from_area TEXT NOT NULL,
  to_area TEXT NOT NULL,
  trip_type TEXT NOT NULL,
  vehicle_type_id TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  base_price_jpy INTEGER NOT NULL,
  night_fee_jpy INTEGER NOT NULL DEFAULT 0,
  urgent_fee_jpy INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS pricing_rule_overrides ADD COLUMN IF NOT EXISTS from_area TEXT;
ALTER TABLE IF EXISTS pricing_rule_overrides ADD COLUMN IF NOT EXISTS to_area TEXT;
ALTER TABLE IF EXISTS pricing_rule_overrides ADD COLUMN IF NOT EXISTS trip_type TEXT;
ALTER TABLE IF EXISTS pricing_rule_overrides ADD COLUMN IF NOT EXISTS vehicle_type_id TEXT;
ALTER TABLE IF EXISTS pricing_rule_overrides ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS pricing_rule_overrides ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS pricing_rule_overrides ADD COLUMN IF NOT EXISTS base_price_jpy INTEGER;
ALTER TABLE IF EXISTS pricing_rule_overrides ADD COLUMN IF NOT EXISTS night_fee_jpy INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS pricing_rule_overrides ADD COLUMN IF NOT EXISTS urgent_fee_jpy INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS pricing_rule_overrides ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE IF EXISTS pricing_rule_overrides ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS pricing_rule_overrides ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS pricing_rule_overrides ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS pricing_rule_overrides ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;
ALTER TABLE IF EXISTS pricing_rule_overrides ALTER COLUMN night_fee_jpy SET DEFAULT 0;
ALTER TABLE IF EXISTS pricing_rule_overrides ALTER COLUMN urgent_fee_jpy SET DEFAULT 0;
ALTER TABLE IF EXISTS pricing_rule_overrides ALTER COLUMN enabled SET DEFAULT TRUE;
ALTER TABLE IF EXISTS pricing_rule_overrides ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE IF EXISTS pricing_rule_overrides ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_pricing_rule_overrides_lookup
  ON pricing_rule_overrides(from_area, to_area, trip_type, vehicle_type_id, starts_at, ends_at)
  WHERE enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_pricing_rule_overrides_vehicle_type_id
  ON pricing_rule_overrides(vehicle_type_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rule_overrides_trip_type_check'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pricing_rule_overrides
    WHERE trip_type IS NOT NULL
      AND trip_type NOT IN ('PICKUP', 'DROPOFF', 'POINT_TO_POINT')
  ) THEN
    ALTER TABLE pricing_rule_overrides
      ADD CONSTRAINT pricing_rule_overrides_trip_type_check
      CHECK (trip_type IS NULL OR trip_type IN ('PICKUP', 'DROPOFF', 'POINT_TO_POINT'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rule_overrides_time_order'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pricing_rule_overrides
    WHERE starts_at IS NOT NULL
      AND ends_at IS NOT NULL
      AND ends_at <= starts_at
  ) THEN
    ALTER TABLE pricing_rule_overrides
      ADD CONSTRAINT pricing_rule_overrides_time_order
      CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rule_overrides_base_price_nonnegative'
  ) AND NOT EXISTS (
    SELECT 1 FROM pricing_rule_overrides WHERE base_price_jpy IS NOT NULL AND base_price_jpy < 0
  ) THEN
    ALTER TABLE pricing_rule_overrides
      ADD CONSTRAINT pricing_rule_overrides_base_price_nonnegative
      CHECK (base_price_jpy IS NULL OR base_price_jpy >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rule_overrides_night_fee_nonnegative'
  ) AND NOT EXISTS (
    SELECT 1 FROM pricing_rule_overrides WHERE night_fee_jpy IS NOT NULL AND night_fee_jpy < 0
  ) THEN
    ALTER TABLE pricing_rule_overrides
      ADD CONSTRAINT pricing_rule_overrides_night_fee_nonnegative
      CHECK (night_fee_jpy IS NULL OR night_fee_jpy >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rule_overrides_urgent_fee_nonnegative'
  ) AND NOT EXISTS (
    SELECT 1 FROM pricing_rule_overrides WHERE urgent_fee_jpy IS NOT NULL AND urgent_fee_jpy < 0
  ) THEN
    ALTER TABLE pricing_rule_overrides
      ADD CONSTRAINT pricing_rule_overrides_urgent_fee_nonnegative
      CHECK (urgent_fee_jpy IS NULL OR urgent_fee_jpy >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rule_overrides_vehicle_type_id_fkey'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pricing_rule_overrides pro
    LEFT JOIN vehicle_types vt ON vt.id = pro.vehicle_type_id
    WHERE pro.vehicle_type_id IS NOT NULL
      AND vt.id IS NULL
  ) THEN
    ALTER TABLE pricing_rule_overrides
      ADD CONSTRAINT pricing_rule_overrides_vehicle_type_id_fkey
      FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;
