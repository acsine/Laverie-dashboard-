-- Phase 0 — sessions JWT, tentatives de login, 2FA/changement MDP, audit enrichi
-- Copier aussi vers gestion-manager/supabase/migrations/ si déploiement Edge/Supabase CLI

-- Colonnes auth plateforme
ALTER TABLE lav_platform_user
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;

-- Comptes existants : ne pas forcer le changement au prochain login web (sauf seed)
UPDATE lav_platform_user
SET must_change_password = false
WHERE email <> 'superadmin@laverie.com';

-- Sessions refresh
CREATE TABLE IF NOT EXISTS lav_session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES lav_platform_user(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  device_label TEXT,
  ip TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lav_session_user_id_idx ON lav_session(user_id);
CREATE INDEX IF NOT EXISTS lav_session_expires_at_idx ON lav_session(expires_at);

-- Tentatives de connexion (verrouillage)
CREATE TABLE IF NOT EXISTS lav_login_attempt (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lav_login_attempt_email_created_at_idx
  ON lav_login_attempt(email, created_at);

-- Enrichissement audit
ALTER TABLE lav_audit_log
  ADD COLUMN IF NOT EXISTS before JSONB,
  ADD COLUMN IF NOT EXISTS after JSONB,
  ADD COLUMN IF NOT EXISTS ip TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS lav_audit_log_actor_id_idx ON lav_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS lav_audit_log_lav_site_id_idx ON lav_audit_log(lav_site_id);
CREATE INDEX IF NOT EXISTS lav_audit_log_created_at_idx ON lav_audit_log(created_at);
