-- Index pour accélérer les garde-fous suppression (commandes actives)

CREATE INDEX IF NOT EXISTS orders_active_vehicle_type_id_idx
  ON orders (vehicle_type_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS orders_active_vehicle_id_idx
  ON orders (vehicle_id)
  WHERE deleted_at IS NULL AND vehicle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_active_assigned_employee_id_idx
  ON orders (assigned_employee_id)
  WHERE deleted_at IS NULL AND assigned_employee_id IS NOT NULL;