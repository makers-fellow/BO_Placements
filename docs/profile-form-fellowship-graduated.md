# Campo `fellowship_graduated` en el formulario de perfil

Este documento describe el cambio del formulario público `/perfil/<magic_link>`: una pregunta opcional de graduación de Makers Fellowship (solo visible para seekers que buscan trabajo), el refuerzo de que el estado de búsqueda es obligatorio, y el SQL que hay que correr **a mano** en Supabase.

Nada de este cambio se ejecuta contra la base desde el repo. El código asume que la columna existirá después de que corras el script.

---

## 1. Cambios a nivel usuario

### Qué ve el maker

Sigue entrando por su **magic link** personal (`/perfil/<token>`). El link identifica una fila de `placements_makers`. Eso no cambió: funciona para quien busca trabajo, para quien no busca, para founders y para employed.

La primera sección del formulario ahora se llama **“Estado de búsqueda \*”** y la descripción dice que es **obligatorio**. Si guarda sin elegir una de las tres opciones (buscando activamente, abierto a ofertas, no busco trabajo):

- el formulario no se envía
- aparece el error “Selecciona tu estado de búsqueda”
- la página hace scroll hasta esa card

Eso aplica a **todos** los flujos, no solo a seekers.

### Pregunta nueva: ¿Ya eres un Maker graduado?

Solo aparece al **final** del cuestionario de seeker, **después de Fortalezas**, cuando la persona eligió:

- “Buscando activamente”, o
- “Abierto a ofertas”

No la ven quienes eligen “No busco trabajo” (founder o employed). Esos recorridos siguen iguales: mismas cards, mismos campos obligatorios (nombre y rol), mismos botones (“Guardar como founder” / “Guardar como empleado”).

La pregunta es **opcional**. Diseño igual al resto (dos tarjetas con borde, verde `#86EFAC` al seleccionar):

| Acción en el form | Valor que se guarda |
| --- | --- |
| No toca la pregunta | `null` |
| “Sí, ya me gradué” | `true` |
| “Aún no” | `false` |
| Clic de nuevo en la opción ya seleccionada | vuelve a `null` (deseleccionar) |

No bloquear el envío si queda sin responder.

### Qué no cambió para el usuario

- Founder y employed siguen completando y guardando su perfil como hoy.
- Quien ya tenía perfil y reabre el link sigue viendo sus datos anteriores.
- El dashboard de candidatos, campañas de WhatsApp y la pantalla de resumen post-guardar **no muestran** este campo. El dato sí viaja en el objeto interno del form (TypeScript), pero la UI de confirmación no lo lista.
- No hay login nuevo: el token del link sigue siendo la credencial.

---

## 2. Cambios en código / repositorio

### Archivos tocados

| Archivo | Rol |
| --- | --- |
| `scripts/add_fellowship_graduated.sql` | Migración para correr **tú** en el SQL Editor. El app no la ejecuta. |
| `app/perfil/[token]/actions.ts` | Tipo `ProfileData` + escritura del campo solo en el payload seeker. |
| `app/perfil/[token]/page.tsx` | Hidrata `fellowship_graduated` en `initialData` para cualquier magic link. |
| `app/perfil/[token]/profile-form.tsx` | Estado, UI de la pregunta, scroll si falta estado de búsqueda. |
| `docs/profile-form-fellowship-graduated.md` | Este documento. |

### Archivos que **no** se tocaron (a propósito)

- `app/page.tsx` y `app/candidates-table.tsx` (dashboard)
- `app/campaigns/*`
- `app/perfil/[token]/confirmation-view.tsx` (no se muestra el campo; el form le pasa el objeto completo para que compile)
- RLS, env vars, `lib/supabase/*`

### Cómo sigue funcionando el magic link para todos

```
GET /perfil/<token>
  → page.tsx lee placements_makers WHERE magic_link_token = token (select *)
  → si existe la fila, monta ProfileForm con initialData de ESA persona
  → al guardar, updateProfile hace UPDATE ... WHERE magic_link_token = token
```

No hay filtro por `user_type` ni por `search_status` en la lectura ni en el UPDATE. Seeker, founder y employed **siempre** actualizan su fila si el token es válido.

### `page.tsx`: por qué hay que mapear el campo

`select("*")` ya trae columnas nuevas de Postgres cuando existen. El formulario **no** usa la fila cruda: solo usa lo que se copia a `initialData`. Si no se pasa `fellowship_graduated`, al recargar el link el `useState` arranca en `null` aunque en la base esté `true`.

```ts
fellowship_graduated: maker.fellowship_graduated ?? null
```

Se usa `?? null` (no `?? false`) para no convertir “no respondió” / columna ausente en “no se graduó”. Founder y employed también reciben el valor, pero no ven la pregunta; no cambia su UI.

Hasta que corras el SQL, `maker.fellowship_graduated` será `undefined` y el form tratará `null`. La lectura no rompe. **El guardado de un seeker sí fallará** si el payload incluye una columna que Postgres aún no tiene (ver sección 3).

### `actions.ts`: qué se escribe y qué no

`ProfileData` ahora incluye:

```ts
fellowship_graduated: boolean | null
```

No hay validación de “debe responderse”. `search_status` sigue siendo obligatorio para **todos** los `user_type` (check que ya existía).

El payload común sigue siendo solo:

- `search_status`
- `user_type`
- `profile_last_updated_at`

`fellowship_graduated` se agrega **únicamente** en el `Object.assign` del branch `user_type === "seeker"`.

Consecuencias:

- Un seeker que busca trabajo persiste `true` / `false` / `null`.
- Un founder o employed **no manda** esa columna. Si alguna vez fue seeker y había contestado, el valor previo **no se pisa**.
- Los branches founder/employed no se modificaron: mismos campos `startup_*` / `employer_*`, mismas validaciones de nombre y rol.

### `profile-form.tsx`

- Estado `fellowshipGraduated: boolean | null`, inicializado desde `initialData`.
- Card nueva **dentro** de `{flowType === "seeker" && searchStatus !== "not_looking"}`, después de Fortalezas. Los bloques founder/employed no se movieron.
- Título de la primera card: `Estado de búsqueda *`. Descripción: `Obligatorio. ...`.
- Si `validateForm` falla por falta de `searchStatus`, `scrollIntoView` a esa sección.
- `buildProfileData()` arma el objeto una sola vez (submit + `ConfirmationView`). `ConfirmationView` no se editó; ignora campos que no renderiza.

---

## 3. Ajuste en Supabase (manual — hazlo tú)

El código **no** crea la columna. Tienes que correr el SQL en el proyecto de Supabase **antes** de que un seeker guarde el formulario con este deploy. Si no, PostgREST devolverá un error del estilo “Could not find the `fellowship_graduated` column”.

### Por qué este SQL

- Tipo `boolean`: `true` / `false` / `null`, como pidió el producto.
- **Sin `NOT NULL` y sin `DEFAULT false`**: las filas actuales quedan en `null` (“aún no respondió”). Un default `false` marcaría a todo el histórico como “no graduado”.
- `IF NOT EXISTS`: se puede correr más de una vez sin fallar.
- La columna existe en **todas** las filas de `placements_makers`. Solo el flujo seeker del form la escribe por ahora.

### Dónde correrlo

1. Abre el [Dashboard de Supabase](https://supabase.com/dashboard) del proyecto de Placements.
2. Ve a **SQL Editor**.
3. Pega el contenido de `scripts/add_fellowship_graduated.sql` (también está abajo) y ejecútalo.

```sql
ALTER TABLE placements_makers
  ADD COLUMN IF NOT EXISTS fellowship_graduated boolean;

COMMENT ON COLUMN placements_makers.fellowship_graduated
  IS 'true = Maker graduado / completó el fellowship; false = no; null = no respondió';
```

No hace falta cambiar RLS: `placements_makers` ya se lee/escribe con `service_role` y el filtro `.eq("magic_link_token", token)` en el form, igual que el resto de columnas del perfil.

### Cómo verificar que quedó bien

En Supabase:

1. **Table Editor** → tabla `placements_makers` → la columna `fellowship_graduated` aparece.
2. Filas viejas: valor vacío / `null`.
3. Después de que un seeker guarde “Sí” o “Aún no” desde su magic link, esa fila debe mostrar `true` o `false`.

Opcional, en SQL Editor (solo lectura):

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'placements_makers'
  AND column_name = 'fellowship_graduated';
```

Esperado: `boolean`, nullable, sin default.

### Orden recomendado

1. Correr el SQL en Supabase.
2. Confirmar la columna en Table Editor.
3. Desplegar / usar el código de este cambio.
4. Probar un magic link de seeker (con y sin responder la pregunta) y uno de founder/employed (el form debe guardar como siempre).

---

## 4. Cómo probar el formulario (sin cambiar el dashboard)

Usa un magic link real (`/perfil/<token>`):

1. **Sin estado de búsqueda** (perfil vacío o borrando la selección no aplica; en un perfil nuevo): Guardar → no envía, scroll al error.
2. **Seeker buscando / abierto a ofertas**: aparece la pregunta al final. Guardar sin tocarla → fila con `fellowship_graduated = null`. “Sí” → `true`. Recargar el link → sigue en “Sí”. “Aún no” → `false`. Clic otra vez en la misma opción → `null`.
3. **No busco trabajo → founder**: no se ve la pregunta; “Guardar como founder” sigue pidiendo nombre y rol de la startup.
4. **No busco trabajo → employed**: no se ve la pregunta; “Guardar como empleado” sigue pidiendo empresa y rol.

Si el SQL aún no se corrió, los pasos 3 y 4 (founder/employed) siguen pudiendo guardar. El paso 2 (seeker) fallará en el UPDATE hasta que exista la columna.
