-- Archivage manuel (soft delete) d'un employé déjà retiré de l'app mais encore actif dans Supabase.
-- Remplacez :employee_id par l'id (ex. emp_...).

UPDATE employees
SET
  deleted_at = COALESCE(deleted_at, NOW()),
  is_active = FALSE,
  updated_at = NOW()
WHERE id = ':employee_id';

-- Contrôle : deleted_at renseigné, is_active = false
SELECT id, first_name, last_name, is_active, deleted_at
FROM employees
WHERE id = ':employee_id';