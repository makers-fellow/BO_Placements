-- ==========================================================
-- Cierra el acceso público a placements_makers
--
-- Reemplaza las policies de enable_rls_policies.sql, que daban a `anon`
-- SELECT y UPDATE sobre TODA la tabla (USING (true)). Con eso, cualquiera
-- con la clave publicable podía leer nombres, emails, teléfonos, salarios y
-- todos los magic_link_token, y reescribir cualquier perfil.
--
-- ⚠️ ORDEN DE EJECUCIÓN: este script ROMPE la app si se corre antes de
-- desplegar los cambios que mueven las lecturas/escrituras a service_role
-- (app/page.tsx, app/campaigns/*, app/perfil/[token]/*). Correr DESPUÉS del
-- deploy, o aceptar unos minutos de /perfil y / caídos.
--
-- Correr en Supabase SQL Editor.
-- ==========================================================

-- 1. Fuera las policies permisivas.
DROP POLICY IF EXISTS "Allow public read access" ON placements_makers;
DROP POLICY IF EXISTS "Allow update via magic_link_token" ON placements_makers;

-- Por si alguna vez se creó la de INSERT que quedó comentada en el script viejo.
DROP POLICY IF EXISTS "Allow public insert" ON placements_makers;

-- 2. RLS sigue activo. Sin policies, `anon` y `authenticated` no ven ni una fila.
--    `service_role` ignora RLS, y es el rol que usará el servidor de la app.
ALTER TABLE placements_makers ENABLE ROW LEVEL SECURITY;

-- 3. Defensa en profundidad: quitar también los GRANTs de tabla. Así, si alguien
--    vuelve a crear una policy permisiva por descuido, el acceso sigue bloqueado
--    porque falta el privilegio a nivel de tabla.
REVOKE ALL ON TABLE placements_makers FROM anon;
REVOKE ALL ON TABLE placements_makers FROM authenticated;

-- 4. Verificación: no debe devolver ninguna fila.
--    (Si devuelve algo, quedó una policy abierta.)
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'placements_makers';

-- 5. Verificación de grants: no debe aparecer anon ni authenticated.
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'placements_makers'
ORDER BY grantee, privilege_type;

-- ==========================================================
-- Rollback (solo si hay que volver atrás con urgencia)
-- ==========================================================
-- GRANT SELECT, UPDATE ON TABLE placements_makers TO anon, authenticated;
-- CREATE POLICY "Allow public read access" ON placements_makers
--   FOR SELECT USING (true);
-- CREATE POLICY "Allow update via magic_link_token" ON placements_makers
--   FOR UPDATE USING (true) WITH CHECK (true);
