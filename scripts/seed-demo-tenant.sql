-- SQL Editor Supabase (projet lié à .env.local) — tenant minimal + essai
-- Ordre recommandé : 1) ce fichier  2) seed-superadmin.sql si besoin

-- Site principal
INSERT INTO lav_site (id, nom, adresse, ville, pays, is_active)
VALUES (
  'lav_site_000001',
  'Site principal',
  'Adresse par défaut',
  'Douala',
  'Cameroun',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom,
  ville = EXCLUDED.ville,
  is_active = TRUE,
  updated_at = NOW();

-- Essai par site (3 mois à partir de maintenant)
INSERT INTO lav_site_config (lav_site_id, trial_end_at, trial_duration_months, remote_version)
VALUES (
  'lav_site_000001',
  NOW() + INTERVAL '3 months',
  3,
  1
)
ON CONFLICT (lav_site_id) DO UPDATE SET
  trial_end_at = EXCLUDED.trial_end_at,
  trial_duration_months = EXCLUDED.trial_duration_months,
  updated_at = NOW();

-- Configuration globale (essai plateforme)
INSERT INTO app_config (
  id,
  trial_end_at,
  trial_duration_months,
  extension_requested,
  extension_approved,
  extension_months,
  remote_version
)
VALUES (
  'default',
  NOW() + INTERVAL '3 months',
  3,
  FALSE,
  FALSE,
  1,
  1
)
ON CONFLICT (id) DO UPDATE SET
  trial_end_at = EXCLUDED.trial_end_at,
  trial_duration_months = EXCLUDED.trial_duration_months,
  updated_at = NOW();

-- Contrôles
SELECT id, nom, ville, is_active FROM lav_site WHERE id = 'lav_site_000001';
SELECT lav_site_id, trial_end_at, trial_duration_months FROM lav_site_config WHERE lav_site_id = 'lav_site_000001';
SELECT id, trial_end_at, trial_duration_months, extension_requested, remote_version FROM app_config WHERE id = 'default';