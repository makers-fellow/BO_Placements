-- ==========================================================
-- Auditoría de magic_link_token (solo lectura)
--
-- Cerrar la tabla a `anon` evita que alguien se descargue los tokens, pero si
-- los tokens son cortos o predecibles siguen siendo adivinables por fuerza
-- bruta contra /perfil/<token>. Este script solo diagnostica: no modifica nada.
--
-- Correr en Supabase SQL Editor.
-- ==========================================================

-- 1. Distribución de longitudes. Un token seguro debería tener >= 22 caracteres
--    (~128 bits en base64) y todos la misma longitud.
SELECT
  length(magic_link_token) AS longitud,
  count(*)                 AS cantidad
FROM placements_makers
WHERE magic_link_token IS NOT NULL
GROUP BY 1
ORDER BY 1;

-- 2. Forma de los tokens: ¿parecen secuenciales, numéricos, o derivados de
--    datos del maker (nombre/email)? Cualquiera de esos casos es adivinable.
SELECT
  count(*) FILTER (WHERE magic_link_token ~ '^[0-9]+$')                  AS solo_numeros,
  count(*) FILTER (WHERE magic_link_token ~ '^[a-z]+$')                  AS solo_minusculas,
  count(*) FILTER (WHERE length(magic_link_token) < 22)                  AS mas_cortos_de_22,
  count(*) FILTER (WHERE magic_link_token IS NULL)                       AS sin_token,
  count(*)                                                              AS total
FROM placements_makers;

-- 3. Muestra anonimizada (primeros 4 caracteres) para inspeccionar el patrón
--    sin volcar tokens completos en el historial del SQL Editor.
SELECT left(magic_link_token, 4) || '…' AS prefijo, length(magic_link_token) AS longitud
FROM placements_makers
WHERE magic_link_token IS NOT NULL
ORDER BY magic_link_token
LIMIT 20;

-- 4. Duplicados: no debería haber ninguno. Si hay, dos makers comparten link.
SELECT magic_link_token, count(*)
FROM placements_makers
WHERE magic_link_token IS NOT NULL
GROUP BY 1
HAVING count(*) > 1;

-- ==========================================================
-- Regeneración (NO correr sin decidirlo en equipo)
--
-- ⚠️ Invalida TODOS los links ya enviados, incluidos los de las campañas de
-- WhatsApp que ya salieron: quien reciba un recordatorio viejo verá un 404.
-- Solo tiene sentido si la auditoría muestra tokens débiles, y conviene
-- acompañarlo de una campaña nueva con los links regenerados.
--
-- gen_random_bytes viene de pgcrypto: CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- ==========================================================
-- UPDATE placements_makers
-- SET magic_link_token = replace(replace(encode(gen_random_bytes(24), 'base64'), '/', '_'), '+', '-')
-- WHERE magic_link_token IS NULL          -- quitar este WHERE para regenerar TODOS
--    OR length(magic_link_token) < 22;
--
-- Un índice único evita colisiones y acelera la búsqueda por token:
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_placements_makers_magic_link_token
--   ON placements_makers(magic_link_token);
