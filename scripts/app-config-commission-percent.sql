-- Commission par défaut (%) pour tous les employés « par véhicule »
ALTER TABLE app_config
  ADD COLUMN IF NOT EXISTS per_vehicle_default_commission_percent numeric;

COMMENT ON COLUMN app_config.per_vehicle_default_commission_percent IS
  'Pourcentage de commission par défaut sur le montant commande (contrat par véhicule).';