ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_status TEXT;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS payment_confirmation_email_sent_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS payment_confirmation_email_provider_id TEXT;

ALTER TABLE IF EXISTS bookings
  ALTER COLUMN stripe_payment_status SET DEFAULT 'unpaid';

CREATE INDEX IF NOT EXISTS idx_bookings_stripe_checkout_session_id
  ON bookings(stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_bookings_payment_confirmation_email_sent_at
  ON bookings(payment_confirmation_email_sent_at);
