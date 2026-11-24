-- Gestionnaire prolongation d'essai (SHA-256 du mot de passe, aligné Edge sync-api)
-- Colonnes ajoutées si absentes ; compte : fomocaleb2@gmail.com

ALTER TABLE lav_platform_user
  ADD COLUMN IF NOT EXISTS can_approve_trial BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE lav_platform_user
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE lav_platform_user
SET is_super_admin = TRUE
WHERE email = 'superadmin@laverie.com';

INSERT INTO lav_platform_user (
  id,
  email,
  password_hash,
  first_name,
  last_name,
  phone,
  is_active,
  must_change_password,
  can_approve_trial,
  is_super_admin
)
VALUES (
  'lav_puser_trial_mgr',
  'fomocaleb2@gmail.com',
  '2d77d6fc02b5b3938c648c7e905a10fa5bfd8c48edbb64a417e8c8e20ac1ce59',
  'Trial',
  'Manager',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  FALSE
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  can_approve_trial = TRUE,
  is_super_admin = FALSE,
  is_active = TRUE;

SELECT id, email, can_approve_trial, is_super_admin, is_active
FROM lav_platform_user
WHERE email IN ('fomocaleb2@gmail.com', 'superadmin@laverie.com');