ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_status TEXT;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_fee_jpy INTEGER;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS stripe_balance_transaction_id TEXT;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS payment_confirmation_email_sent_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS payment_confirmation_email_provider_id TEXT;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS stripe_refund_status TEXT;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS refund_amount_jpy INTEGER;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS refund_fee_deducted_jpy INTEGER;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS refund_failure_reason TEXT;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS refund_confirmation_email_sent_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS refund_confirmation_email_provider_id TEXT;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS merchant_order_email_sent_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS merchant_order_email_provider_id TEXT;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS merchant_refund_email_sent_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS merchant_refund_email_provider_id TEXT;

ALTER TABLE IF EXISTS bookings
  ALTER COLUMN stripe_payment_status SET DEFAULT 'unpaid';

CREATE INDEX IF NOT EXISTS idx_bookings_stripe_checkout_session_id
  ON bookings(stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_bookings_payment_confirmation_email_sent_at
  ON bookings(payment_confirmation_email_sent_at);

CREATE INDEX IF NOT EXISTS idx_bookings_stripe_refund_id
  ON bookings(stripe_refund_id);

CREATE INDEX IF NOT EXISTS idx_bookings_refund_confirmation_email_sent_at
  ON bookings(refund_confirmation_email_sent_at);

CREATE INDEX IF NOT EXISTS idx_bookings_merchant_order_email_sent_at
  ON bookings(merchant_order_email_sent_at);

CREATE INDEX IF NOT EXISTS idx_bookings_merchant_refund_email_sent_at
  ON bookings(merchant_refund_email_sent_at);
