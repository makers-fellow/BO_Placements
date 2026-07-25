-- ==========================================================
-- Cierra el bucket "CVs Makers"
--
-- enable_rls_policies.sql dejaba a `anon` con SELECT, INSERT y DELETE sobre
-- todos los objetos del bucket: cualquiera con la clave publicable podía
-- descargar o BORRAR los CVs. Y como el bucket es público, los PDFs son
-- accesibles por URL sin ninguna clave.
--
-- ⚠️ ORDEN DE EJECUCIÓN: al pasar el bucket a privado, las URLs guardadas en
-- placements_makers.cv_url (generadas con getPublicUrl) dejan de funcionar.
-- El dashboard tiene que generar signed URLs en el servidor. Correr DESPUÉS
-- de desplegar ese cambio.
--
-- Correr en Supabase SQL Editor.
-- ==========================================================

-- 1. Bucket privado: se accede solo con signed URLs o con service_role.
UPDATE storage.buckets
SET public = false
WHERE id = 'CVs Makers';

-- 2. Fuera las policies públicas. El upload, la descarga y el borrado ocurren
--    todos en server actions, que usarán service_role (ignora RLS), así que el
--    bucket no necesita ninguna policy para `anon`.
DROP POLICY IF EXISTS "Allow public upload to CVs Makers" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from CVs Makers" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from CVs Makers" ON storage.objects;

-- 3. Verificación: no debe quedar ninguna policy que mencione el bucket.
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (qual ILIKE '%CVs Makers%' OR with_check ILIKE '%CVs Makers%');

-- 4. Verificación: public = false.
SELECT id, name, public FROM storage.buckets WHERE id = 'CVs Makers';

-- ==========================================================
-- Rollback
-- ==========================================================
-- UPDATE storage.buckets SET public = true WHERE id = 'CVs Makers';
-- CREATE POLICY "Allow public read from CVs Makers" ON storage.objects
--   FOR SELECT USING (bucket_id = 'CVs Makers');
-- CREATE POLICY "Allow public upload to CVs Makers" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'CVs Makers');
-- CREATE POLICY "Allow public delete from CVs Makers" ON storage.objects
--   FOR DELETE USING (bucket_id = 'CVs Makers');
