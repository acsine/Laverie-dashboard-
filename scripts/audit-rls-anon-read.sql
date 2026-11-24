-- Lecture journal audit pour l’admin web (client Supabase anon + RLS)
DROP POLICY IF EXISTS "anon_read_lav_audit_log" ON lav_audit_log;
CREATE POLICY "anon_read_lav_audit_log"
  ON lav_audit_log
  FOR SELECT
  TO anon
  USING (true);