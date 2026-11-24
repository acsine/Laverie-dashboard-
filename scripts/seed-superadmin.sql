-- À exécuter dans Supabase : SQL Editor (projet vwvmwpdxjpdhdjogdfah)
-- Répare platform-login pour superadmin@laverie.com / admin123 (hash SHA-256, comme l'Edge sync-api)

ALTER TABLE lav_platform_user
  ADD COLUMN IF NOT EXISTS can_approve_trial BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE lav_platform_user
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO lav_platform_user (
  id, email, password_hash, first_name, last_name, phone, is_active, is_super_admin
)
VALUES (
  'lav_puser_000001',
  'superadmin@laverie.com',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'Super',
  'Admin',
  '0600000000',
  TRUE,
  TRUE
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = TRUE,
  is_super_admin = TRUE;