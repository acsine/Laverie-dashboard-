-- Lier chaque carte fidélité à un client (1 carte active / client max)
ALTER TABLE lav_fidelite_carte
  ADD COLUMN IF NOT EXISTS customer_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS lav_fidelite_carte_customer_active_uidx
  ON lav_fidelite_carte (customer_id)
  WHERE customer_id IS NOT NULL AND statut IN ('active', 'suspended');

COMMENT ON COLUMN lav_fidelite_carte.customer_id IS
  'Client propriétaire de la carte (référence customers.id, synchro cloud).';