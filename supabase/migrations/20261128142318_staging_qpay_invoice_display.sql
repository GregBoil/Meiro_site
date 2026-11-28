alter table public.qpay_payments add column qr_image text, add column payment_url text, add column expires_at timestamptz, add column last_checked_at timestamptz;
