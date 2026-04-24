-- TripGo safe, idempotent PostgreSQL / Supabase bootstrap.
-- This script is intentionally non-destructive:
-- - no DROP TABLE
-- - no TRUNCATE
-- - no blanket DELETE
-- - missing columns / indexes / constraints are added carefully
-- - existing legacy tables such as `orders` are left untouched

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS vehicle_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  seats INTEGER NOT NULL,
  luggage_small INTEGER NOT NULL DEFAULT 0,
  luggage_medium INTEGER NOT NULL DEFAULT 0,
  luggage_large INTEGER NOT NULL DEFAULT 0,
  is_luxury BOOLEAN NOT NULL DEFAULT FALSE,
  is_bus BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pricing_rules (
  id TEXT PRIMARY KEY,
  from_area TEXT NOT NULL,
  to_area TEXT NOT NULL,
  trip_type TEXT NOT NULL,
  base_price_jpy INTEGER NOT NULL,
  night_fee_jpy INTEGER NOT NULL DEFAULT 0,
  urgent_fee_jpy INTEGER NOT NULL DEFAULT 0,
  vehicle_type_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
  currency TEXT NOT NULL DEFAULT 'JPY',
  trip_type TEXT NOT NULL,
  pickup_time TIMESTAMPTZ NOT NULL,
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  flight_number TEXT,
  flight_date TIMESTAMPTZ,
  flight_note TEXT,
  passengers INTEGER NOT NULL,
  child_seats INTEGER NOT NULL DEFAULT 0,
  luggage_small INTEGER NOT NULL DEFAULT 0,
  luggage_medium INTEGER NOT NULL DEFAULT 0,
  luggage_large INTEGER NOT NULL DEFAULT 0,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_note TEXT,
  pricing_base_jpy INTEGER NOT NULL,
  pricing_night_jpy INTEGER NOT NULL DEFAULT 0,
  pricing_urgent_jpy INTEGER NOT NULL DEFAULT 0,
  pricing_child_seat_jpy INTEGER NOT NULL DEFAULT 0,
  pricing_manual_adjustment_jpy INTEGER NOT NULL DEFAULT 0,
  pricing_total_jpy INTEGER NOT NULL,
  pricing_note TEXT,
  cancel_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_payment_status TEXT,
  paid_at TIMESTAMPTZ,
  vehicle_type_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL DEFAULT 'USER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_emails (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  email TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS vehicle_types ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE IF EXISTS vehicle_types ADD COLUMN IF NOT EXISTS seats INTEGER;
ALTER TABLE IF EXISTS vehicle_types ADD COLUMN IF NOT EXISTS luggage_small INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS vehicle_types ADD COLUMN IF NOT EXISTS luggage_medium INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS vehicle_types ADD COLUMN IF NOT EXISTS luggage_large INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS vehicle_types ADD COLUMN IF NOT EXISTS is_luxury BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS vehicle_types ADD COLUMN IF NOT EXISTS is_bus BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS vehicle_types ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS vehicle_types ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS vehicle_types ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS pricing_rules ADD COLUMN IF NOT EXISTS from_area TEXT;
ALTER TABLE IF EXISTS pricing_rules ADD COLUMN IF NOT EXISTS to_area TEXT;
ALTER TABLE IF EXISTS pricing_rules ADD COLUMN IF NOT EXISTS trip_type TEXT;
ALTER TABLE IF EXISTS pricing_rules ADD COLUMN IF NOT EXISTS base_price_jpy INTEGER;
ALTER TABLE IF EXISTS pricing_rules ADD COLUMN IF NOT EXISTS night_fee_jpy INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS pricing_rules ADD COLUMN IF NOT EXISTS urgent_fee_jpy INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS pricing_rules ADD COLUMN IF NOT EXISTS vehicle_type_id TEXT;
ALTER TABLE IF EXISTS pricing_rules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS pricing_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING_PAYMENT';
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'JPY';
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS trip_type TEXT;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS pickup_time TIMESTAMPTZ;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS pickup_location TEXT;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS dropoff_location TEXT;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS flight_number TEXT;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS flight_date TIMESTAMPTZ;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS flight_note TEXT;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS passengers INTEGER;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS child_seats INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS luggage_small INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS luggage_medium INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS luggage_large INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS contact_note TEXT;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS pricing_base_jpy INTEGER;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS pricing_night_jpy INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS pricing_urgent_jpy INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS pricing_child_seat_jpy INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS pricing_manual_adjustment_jpy INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS pricing_total_jpy INTEGER;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS pricing_note TEXT;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS stripe_payment_status TEXT;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS vehicle_type_id TEXT;
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'USER';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS user_emails ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE IF EXISTS user_emails ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE IF EXISTS user_emails ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE IF EXISTS user_emails ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS user_emails ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS verification_codes ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE IF EXISTS verification_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS verification_codes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS vehicle_types ALTER COLUMN luggage_small SET DEFAULT 0;
ALTER TABLE IF EXISTS vehicle_types ALTER COLUMN luggage_medium SET DEFAULT 0;
ALTER TABLE IF EXISTS vehicle_types ALTER COLUMN luggage_large SET DEFAULT 0;
ALTER TABLE IF EXISTS vehicle_types ALTER COLUMN is_luxury SET DEFAULT FALSE;
ALTER TABLE IF EXISTS vehicle_types ALTER COLUMN is_bus SET DEFAULT FALSE;
ALTER TABLE IF EXISTS vehicle_types ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE IF EXISTS vehicle_types ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE IF EXISTS pricing_rules ALTER COLUMN night_fee_jpy SET DEFAULT 0;
ALTER TABLE IF EXISTS pricing_rules ALTER COLUMN urgent_fee_jpy SET DEFAULT 0;
ALTER TABLE IF EXISTS pricing_rules ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE IF EXISTS pricing_rules ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE IF EXISTS bookings ALTER COLUMN status SET DEFAULT 'PENDING_PAYMENT';
ALTER TABLE IF EXISTS bookings ALTER COLUMN is_urgent SET DEFAULT FALSE;
ALTER TABLE IF EXISTS bookings ALTER COLUMN currency SET DEFAULT 'JPY';
ALTER TABLE IF EXISTS bookings ALTER COLUMN child_seats SET DEFAULT 0;
ALTER TABLE IF EXISTS bookings ALTER COLUMN luggage_small SET DEFAULT 0;
ALTER TABLE IF EXISTS bookings ALTER COLUMN luggage_medium SET DEFAULT 0;
ALTER TABLE IF EXISTS bookings ALTER COLUMN luggage_large SET DEFAULT 0;
ALTER TABLE IF EXISTS bookings ALTER COLUMN pricing_night_jpy SET DEFAULT 0;
ALTER TABLE IF EXISTS bookings ALTER COLUMN pricing_urgent_jpy SET DEFAULT 0;
ALTER TABLE IF EXISTS bookings ALTER COLUMN pricing_child_seat_jpy SET DEFAULT 0;
ALTER TABLE IF EXISTS bookings ALTER COLUMN pricing_manual_adjustment_jpy SET DEFAULT 0;
ALTER TABLE IF EXISTS bookings ALTER COLUMN stripe_payment_status SET DEFAULT 'unpaid';
ALTER TABLE IF EXISTS bookings ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE IF EXISTS bookings ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE IF EXISTS users ALTER COLUMN role SET DEFAULT 'USER';
ALTER TABLE IF EXISTS users ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE IF EXISTS users ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE IF EXISTS user_emails ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE IF EXISTS verification_codes ALTER COLUMN created_at SET DEFAULT NOW();

UPDATE vehicle_types
SET
  luggage_small = COALESCE(luggage_small, 0),
  luggage_medium = COALESCE(luggage_medium, 0),
  luggage_large = COALESCE(luggage_large, 0),
  is_luxury = COALESCE(is_luxury, FALSE),
  is_bus = COALESCE(is_bus, FALSE),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE
  luggage_small IS NULL
  OR luggage_medium IS NULL
  OR luggage_large IS NULL
  OR is_luxury IS NULL
  OR is_bus IS NULL
  OR created_at IS NULL
  OR updated_at IS NULL;

UPDATE pricing_rules
SET
  night_fee_jpy = COALESCE(night_fee_jpy, 0),
  urgent_fee_jpy = COALESCE(urgent_fee_jpy, 0),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE
  night_fee_jpy IS NULL
  OR urgent_fee_jpy IS NULL
  OR created_at IS NULL
  OR updated_at IS NULL;

UPDATE bookings
SET
  status = COALESCE(status, 'PENDING_PAYMENT'),
  is_urgent = COALESCE(is_urgent, FALSE),
  currency = COALESCE(currency, 'JPY'),
  child_seats = COALESCE(child_seats, 0),
  luggage_small = COALESCE(luggage_small, 0),
  luggage_medium = COALESCE(luggage_medium, 0),
  luggage_large = COALESCE(luggage_large, 0),
  pricing_night_jpy = COALESCE(pricing_night_jpy, 0),
  pricing_urgent_jpy = COALESCE(pricing_urgent_jpy, 0),
  pricing_child_seat_jpy = COALESCE(pricing_child_seat_jpy, 0),
  pricing_manual_adjustment_jpy = COALESCE(pricing_manual_adjustment_jpy, 0),
  stripe_payment_status = COALESCE(stripe_payment_status, 'unpaid'),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE
  status IS NULL
  OR is_urgent IS NULL
  OR currency IS NULL
  OR child_seats IS NULL
  OR luggage_small IS NULL
  OR luggage_medium IS NULL
  OR luggage_large IS NULL
  OR pricing_night_jpy IS NULL
  OR pricing_urgent_jpy IS NULL
  OR pricing_child_seat_jpy IS NULL
  OR pricing_manual_adjustment_jpy IS NULL
  OR stripe_payment_status IS NULL
  OR created_at IS NULL
  OR updated_at IS NULL;

UPDATE users
SET
  role = COALESCE(role, 'USER'),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE role IS NULL OR created_at IS NULL OR updated_at IS NULL;

UPDATE user_emails
SET created_at = COALESCE(created_at, NOW())
WHERE created_at IS NULL;

UPDATE verification_codes
SET created_at = COALESCE(created_at, NOW())
WHERE created_at IS NULL;

INSERT INTO vehicle_types (
  id,
  name,
  seats,
  luggage_small,
  luggage_medium,
  luggage_large,
  is_luxury,
  is_bus,
  description,
  created_at,
  updated_at
)
SELECT
  'economy_5',
  '5座车（经济型）',
  4,
  2,
  1,
  1,
  FALSE,
  FALSE,
  '适合 1-3 人轻装出行',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM vehicle_types WHERE id = 'economy_5' OR name = '5座车（经济型）'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicle_types (
  id,
  name,
  seats,
  luggage_small,
  luggage_medium,
  luggage_large,
  is_luxury,
  is_bus,
  description,
  created_at,
  updated_at
)
SELECT
  'business_7',
  '7座车（商务型）',
  6,
  4,
  3,
  2,
  FALSE,
  FALSE,
  '适合家庭/多人出行',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM vehicle_types WHERE id = 'business_7' OR name = '7座车（商务型）'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicle_types (
  id,
  name,
  seats,
  luggage_small,
  luggage_medium,
  luggage_large,
  is_luxury,
  is_bus,
  description,
  created_at,
  updated_at
)
SELECT
  'large_9',
  '9座车（大空间）',
  8,
  6,
  4,
  3,
  FALSE,
  FALSE,
  '适合行李较多或 6-8 人',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM vehicle_types WHERE id = 'large_9' OR name = '9座车（大空间）'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicle_types (
  id,
  name,
  seats,
  luggage_small,
  luggage_medium,
  luggage_large,
  is_luxury,
  is_bus,
  description,
  created_at,
  updated_at
)
SELECT
  'luxury_vip',
  '豪华型（VIP）',
  4,
  3,
  2,
  2,
  TRUE,
  FALSE,
  '更舒适的商务接待',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM vehicle_types WHERE id = 'luxury_vip' OR name = '豪华型（VIP）'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicle_types (
  id,
  name,
  seats,
  luggage_small,
  luggage_medium,
  luggage_large,
  is_luxury,
  is_bus,
  description,
  created_at,
  updated_at
)
SELECT
  'bus_group',
  '大巴车（团体）',
  20,
  20,
  20,
  20,
  FALSE,
  TRUE,
  '团队出行与大型行李',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM vehicle_types WHERE id = 'bus_group' OR name = '大巴车（团体）'
)
ON CONFLICT (id) DO NOTHING;

WITH default_vehicle_prices AS (
  SELECT *
  FROM (
    VALUES
      ('5座车（经济型）', 16000, 2000, 3000),
      ('7座车（商务型）', 22000, 3000, 4000),
      ('9座车（大空间）', 28000, 4000, 5000),
      ('豪华型（VIP）', 38000, 5000, 6000),
      ('大巴车（团体）', 85000, 8000, 12000)
  ) AS v(name, base_price_jpy, night_fee_jpy, urgent_fee_jpy)
),
airports AS (
  SELECT *
  FROM (
    VALUES
      ('NRT'),
      ('HND'),
      ('KIX'),
      ('NGO'),
      ('CTS')
  ) AS a(code)
),
popular_areas AS (
  SELECT *
  FROM (
    VALUES
      ('Shinjuku'),
      ('Shibuya'),
      ('Ginza'),
      ('Asakusa'),
      ('Ueno'),
      ('Ikebukuro'),
      ('Namba'),
      ('Umeda'),
      ('Dotonbori'),
      ('Gion'),
      ('Kyoto Station')
  ) AS p(code)
),
route_pairs AS (
  SELECT a.code AS from_area, p.code AS to_area, 'PICKUP'::TEXT AS trip_type
  FROM airports a
  CROSS JOIN popular_areas p

  UNION ALL

  SELECT p.code AS from_area, a.code AS to_area, 'DROPOFF'::TEXT AS trip_type
  FROM popular_areas p
  CROSS JOIN airports a

  UNION ALL

  SELECT p1.code AS from_area, p2.code AS to_area, 'POINT_TO_POINT'::TEXT AS trip_type
  FROM popular_areas p1
  CROSS JOIN popular_areas p2
  WHERE p1.code <> p2.code
),
resolved_vehicle_types AS (
  SELECT
    d.name,
    d.base_price_jpy,
    d.night_fee_jpy,
    d.urgent_fee_jpy,
    v.id AS vehicle_type_id
  FROM default_vehicle_prices d
  JOIN LATERAL (
    SELECT id
    FROM vehicle_types
    WHERE name = d.name
    ORDER BY id
    LIMIT 1
  ) v ON TRUE
)
INSERT INTO pricing_rules (
  id,
  from_area,
  to_area,
  trip_type,
  vehicle_type_id,
  base_price_jpy,
  night_fee_jpy,
  urgent_fee_jpy,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid()::TEXT,
  r.from_area,
  r.to_area,
  r.trip_type,
  v.vehicle_type_id,
  v.base_price_jpy,
  v.night_fee_jpy,
  v.urgent_fee_jpy,
  NOW(),
  NOW()
FROM route_pairs r
CROSS JOIN resolved_vehicle_types v
WHERE NOT EXISTS (
  SELECT 1
  FROM pricing_rules pr
  WHERE pr.from_area = r.from_area
    AND pr.to_area = r.to_area
    AND pr.trip_type = r.trip_type
    AND pr.vehicle_type_id = v.vehicle_type_id
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_lookup
  ON pricing_rules(from_area, to_area, trip_type, vehicle_type_id);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_vehicle_type_id
  ON pricing_rules(vehicle_type_id);

CREATE INDEX IF NOT EXISTS idx_bookings_created_at
  ON bookings(created_at);

CREATE INDEX IF NOT EXISTS idx_bookings_pickup_time
  ON bookings(pickup_time);

CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON bookings(status);

CREATE INDEX IF NOT EXISTS idx_bookings_contact_email
  ON bookings(contact_email);

CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_type_id
  ON bookings(vehicle_type_id);

CREATE INDEX IF NOT EXISTS idx_bookings_pickup_time_status
  ON bookings(pickup_time, status);

CREATE INDEX IF NOT EXISTS idx_bookings_stripe_checkout_session_id
  ON bookings(stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_user_emails_user_id
  ON user_emails(user_id);

CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at
  ON verification_codes(expires_at);

DO $$
BEGIN
  IF to_regclass('public.vehicle_types') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_types_seats_positive'
    ) AND NOT EXISTS (
      SELECT 1 FROM vehicle_types WHERE seats IS NOT NULL AND seats <= 0
    ) THEN
      ALTER TABLE vehicle_types
        ADD CONSTRAINT vehicle_types_seats_positive
        CHECK (seats IS NULL OR seats > 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_types_luggage_small_nonnegative'
    ) AND NOT EXISTS (
      SELECT 1 FROM vehicle_types WHERE luggage_small IS NOT NULL AND luggage_small < 0
    ) THEN
      ALTER TABLE vehicle_types
        ADD CONSTRAINT vehicle_types_luggage_small_nonnegative
        CHECK (luggage_small IS NULL OR luggage_small >= 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_types_luggage_medium_nonnegative'
    ) AND NOT EXISTS (
      SELECT 1 FROM vehicle_types WHERE luggage_medium IS NOT NULL AND luggage_medium < 0
    ) THEN
      ALTER TABLE vehicle_types
        ADD CONSTRAINT vehicle_types_luggage_medium_nonnegative
        CHECK (luggage_medium IS NULL OR luggage_medium >= 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_types_luggage_large_nonnegative'
    ) AND NOT EXISTS (
      SELECT 1 FROM vehicle_types WHERE luggage_large IS NOT NULL AND luggage_large < 0
    ) THEN
      ALTER TABLE vehicle_types
        ADD CONSTRAINT vehicle_types_luggage_large_nonnegative
        CHECK (luggage_large IS NULL OR luggage_large >= 0);
    END IF;
  END IF;

  IF to_regclass('public.pricing_rules') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_trip_type_check'
    ) AND NOT EXISTS (
      SELECT 1
      FROM pricing_rules
      WHERE trip_type IS NOT NULL
        AND trip_type NOT IN ('PICKUP', 'DROPOFF', 'POINT_TO_POINT')
    ) THEN
      ALTER TABLE pricing_rules
        ADD CONSTRAINT pricing_rules_trip_type_check
        CHECK (trip_type IS NULL OR trip_type IN ('PICKUP', 'DROPOFF', 'POINT_TO_POINT'));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_base_price_nonnegative'
    ) AND NOT EXISTS (
      SELECT 1 FROM pricing_rules WHERE base_price_jpy IS NOT NULL AND base_price_jpy < 0
    ) THEN
      ALTER TABLE pricing_rules
        ADD CONSTRAINT pricing_rules_base_price_nonnegative
        CHECK (base_price_jpy IS NULL OR base_price_jpy >= 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_night_fee_nonnegative'
    ) AND NOT EXISTS (
      SELECT 1 FROM pricing_rules WHERE night_fee_jpy IS NOT NULL AND night_fee_jpy < 0
    ) THEN
      ALTER TABLE pricing_rules
        ADD CONSTRAINT pricing_rules_night_fee_nonnegative
        CHECK (night_fee_jpy IS NULL OR night_fee_jpy >= 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_urgent_fee_nonnegative'
    ) AND NOT EXISTS (
      SELECT 1 FROM pricing_rules WHERE urgent_fee_jpy IS NOT NULL AND urgent_fee_jpy < 0
    ) THEN
      ALTER TABLE pricing_rules
        ADD CONSTRAINT pricing_rules_urgent_fee_nonnegative
        CHECK (urgent_fee_jpy IS NULL OR urgent_fee_jpy >= 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_vehicle_type_id_fkey'
    ) AND NOT EXISTS (
      SELECT 1
      FROM pricing_rules pr
      LEFT JOIN vehicle_types vt ON vt.id = pr.vehicle_type_id
      WHERE pr.vehicle_type_id IS NOT NULL
        AND vt.id IS NULL
    ) THEN
      ALTER TABLE pricing_rules
        ADD CONSTRAINT pricing_rules_vehicle_type_id_fkey
        FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_route_vehicle_unique'
    ) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pricing_rules
        GROUP BY from_area, to_area, trip_type, vehicle_type_id
        HAVING COUNT(*) > 1
      ) THEN
        ALTER TABLE pricing_rules
          ADD CONSTRAINT pricing_rules_route_vehicle_unique
          UNIQUE (from_area, to_area, trip_type, vehicle_type_id);
      ELSE
        RAISE NOTICE 'Skipping pricing_rules_route_vehicle_unique because duplicate rules already exist.';
      END IF;
    END IF;
  END IF;

  IF to_regclass('public.bookings') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_check'
    ) AND NOT EXISTS (
      SELECT 1
      FROM bookings
      WHERE status IS NOT NULL
        AND status NOT IN ('PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED')
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_status_check
        CHECK (status IS NULL OR status IN ('PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED'));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'bookings_trip_type_check'
    ) AND NOT EXISTS (
      SELECT 1
      FROM bookings
      WHERE trip_type IS NOT NULL
        AND trip_type NOT IN ('PICKUP', 'DROPOFF', 'POINT_TO_POINT')
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_trip_type_check
        CHECK (trip_type IS NULL OR trip_type IN ('PICKUP', 'DROPOFF', 'POINT_TO_POINT'));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'bookings_passengers_positive'
    ) AND NOT EXISTS (
      SELECT 1 FROM bookings WHERE passengers IS NOT NULL AND passengers <= 0
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_passengers_positive
        CHECK (passengers IS NULL OR passengers > 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'bookings_child_seats_nonnegative'
    ) AND NOT EXISTS (
      SELECT 1 FROM bookings WHERE child_seats IS NOT NULL AND child_seats < 0
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_child_seats_nonnegative
        CHECK (child_seats IS NULL OR child_seats >= 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'bookings_luggage_small_nonnegative'
    ) AND NOT EXISTS (
      SELECT 1 FROM bookings WHERE luggage_small IS NOT NULL AND luggage_small < 0
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_luggage_small_nonnegative
        CHECK (luggage_small IS NULL OR luggage_small >= 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'bookings_luggage_medium_nonnegative'
    ) AND NOT EXISTS (
      SELECT 1 FROM bookings WHERE luggage_medium IS NOT NULL AND luggage_medium < 0
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_luggage_medium_nonnegative
        CHECK (luggage_medium IS NULL OR luggage_medium >= 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'bookings_luggage_large_nonnegative'
    ) AND NOT EXISTS (
      SELECT 1 FROM bookings WHERE luggage_large IS NOT NULL AND luggage_large < 0
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_luggage_large_nonnegative
        CHECK (luggage_large IS NULL OR luggage_large >= 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'bookings_pricing_base_nonnegative'
    ) AND NOT EXISTS (
      SELECT 1 FROM bookings WHERE pricing_base_jpy IS NOT NULL AND pricing_base_jpy < 0
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_pricing_base_nonnegative
        CHECK (pricing_base_jpy IS NULL OR pricing_base_jpy >= 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'bookings_pricing_night_nonnegative'
    ) AND NOT EXISTS (
      SELECT 1 FROM bookings WHERE pricing_night_jpy IS NOT NULL AND pricing_night_jpy < 0
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_pricing_night_nonnegative
        CHECK (pricing_night_jpy IS NULL OR pricing_night_jpy >= 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'bookings_pricing_urgent_nonnegative'
    ) AND NOT EXISTS (
      SELECT 1 FROM bookings WHERE pricing_urgent_jpy IS NOT NULL AND pricing_urgent_jpy < 0
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_pricing_urgent_nonnegative
        CHECK (pricing_urgent_jpy IS NULL OR pricing_urgent_jpy >= 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'bookings_pricing_child_seat_nonnegative'
    ) AND NOT EXISTS (
      SELECT 1 FROM bookings WHERE pricing_child_seat_jpy IS NOT NULL AND pricing_child_seat_jpy < 0
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_pricing_child_seat_nonnegative
        CHECK (pricing_child_seat_jpy IS NULL OR pricing_child_seat_jpy >= 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'bookings_vehicle_type_id_fkey'
    ) AND NOT EXISTS (
      SELECT 1
      FROM bookings b
      LEFT JOIN vehicle_types vt ON vt.id = b.vehicle_type_id
      WHERE b.vehicle_type_id IS NOT NULL
        AND vt.id IS NULL
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_vehicle_type_id_fkey
        FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;
    END IF;
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
    ) AND NOT EXISTS (
      SELECT 1 FROM users WHERE role IS NOT NULL AND role NOT IN ('USER', 'ADMIN')
    ) THEN
      ALTER TABLE users
        ADD CONSTRAINT users_role_check
        CHECK (role IS NULL OR role IN ('USER', 'ADMIN'));
    END IF;
  END IF;

  IF to_regclass('public.user_emails') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'user_emails_email_unique'
    ) AND NOT EXISTS (
      SELECT 1 FROM user_emails GROUP BY email HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE user_emails
        ADD CONSTRAINT user_emails_email_unique
        UNIQUE (email);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'user_emails_user_id_fkey'
    ) AND NOT EXISTS (
      SELECT 1
      FROM user_emails ue
      LEFT JOIN users u ON u.id = ue.user_id
      WHERE ue.user_id IS NOT NULL
        AND u.id IS NULL
    ) THEN
      ALTER TABLE user_emails
        ADD CONSTRAINT user_emails_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;
