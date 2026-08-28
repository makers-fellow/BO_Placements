# Formulario público de perfil (`/perfil/<magic_link>`)

Spec del formulario que abre cada maker con su token. Cubre el wizard de 3 secciones para seekers, el guardado parcial, la regla de no borrar datos de otras secciones, el campo `fellowship_graduated`, y el SQL manual de esa columna.

El magic link identifica **una fila** de `placements_makers`. No hay login: el `magic_link_token` es la credencial. Founder y employed **no** usan el wizard.

---

## 1. Cómo entra el maker

```
GET /perfil/<token>
  → page.tsx lee placements_makers WHERE magic_link_token = token (select *)
  → si no hay fila: "Enlace no válido"
  → si hay fila: ProfileForm con initialData de ESA persona (incluye respuestas ya guardadas)
```

`select("*")` trae columnas nuevas cuando existen en Postgres. El form **no** usa la fila cruda: solo lo que se copia a `initialData` en `app/perfil/[token]/page.tsx`.

Reabrir el link **siempre** hidrata inputs/pills desde la DB. Si la persona no toca un campo, el valor que se reenvía al guardar esa sección es el que ya estaba.

**Dónde arranca el wizard al reabrir:**

| `search_status` en la fila | Pantalla inicial |
| --- | --- |
| `actively_seeking` o `open_to_offers` | Sección 1 (pregunta 1 visible + cards de perfil). No se resume en la 2 o 3. |
| `not_looking` o vacío | Paso 0: solo estado de búsqueda (y, si ya eligió “no busco”, el form corto debajo). |

---

## 2. Paso 0 — Estado de búsqueda (obligatorio, fuera de las 3 secciones)

Card **“Estado de búsqueda *”**. No tiene botón Siguiente. Al elegir una opción el formulario **cambia solo**, igual que antes de este wizard:

| Click | Qué pasa en UI | Qué pasa en DB |
| --- | --- | --- |
| Buscando activamente | `user_type = seeker`, aparecen de inmediato las cards de la **sección 1** debajo de esta card | Nada |
| Abierto a ofertas | Igual | Nada |
| No busco trabajo | Form corto founder/employed debajo, botón de guardar de siempre | Nada |

No existe un Siguiente propio de esta pregunta. El primer persist de seeker es el **Siguiente de la sección 1**.

En las **secciones 2 y 3** esta card **no** se muestra. Atrás desde la 2 la vuelve a mostrar (junto con la sección 1). Atrás desde la sección 1 deja **solo** esta card (aunque seeking siga seleccionado); hay que volver a elegir seeking para ver la sección 1. Tampoco escribe en DB.

Si en la sección 1 cambian a “No busco trabajo”, `seekerStep` vuelve a 0 y se muestra founder/employed.

---

## 3. Wizard seeker (solo buscando / abierto a ofertas)

Tres páginas. Las **preguntas y el markup de cada card no cambian**; solo se muestran de a una tanda.

Barra de progreso: el **% global es el mismo de antes** (cuenta todos los bloques seeker, no solo los de la página visible). A la **derecha** de la barra, fuera de ella: `Paso X de 3` (`text-xs font-semibold tabular-nums text-[#C7D2FE]`). Ese texto **no** aparece en el paso 0 ni en founder/employed.

### Sección 1 — Perfil

Cards: Perfil profesional (rol actual, seniority) · Roles de interés · Industrias.

Botones: **Atrás** (sin DB) · **Siguiente**.

Siguiente **no exige** que estén llenos. Si el PATCH falla, no avanza (toast).

Columnas que se escriben (allowlist; nada más):

- `search_status`
- `user_type` = `seeker`
- `current_position`
- `seniority`
- `roles`
- `industries`

**No** se toca `profile_last_updated_at`. **No** se pisan salario, CV, tools, fellowship, startup, employer, etc.

### Sección 2 — Preferencias

Cards: Tools y skills · Ubicación · Tipo de empresa · Pretensión salarial.

Botones: **Atrás** (sin DB) · **Siguiente**.

Única validación extra (igual que antes, solo si llenó ambos): salario máximo ≥ mínimo.

Columnas:

- `tools`
- `city`
- `full_time`
- `company_type`
- `salary_min`
- `salary_max`
- `salary_currency`

**No** `profile_last_updated_at`. **No** pisa sección 1 ni 3.

### Sección 3 — Presencia

Cards: Links y CV · Fortalezas · ¿Ya eres un Maker graduado?

Botones: **Atrás** (sin DB) · **Guardar y activar mi perfil**.

Validaciones si hay valor: LinkedIn debe contener `linkedin.com`; fortalezas ≤ 500. Fellowship **opcional**.

Columnas:

- `linkedin_url`
- `portfolio_url`
- `github_url`
- `cv_url`
- `strengths`
- `fellowship_graduated`
- **`profile_last_updated_at`** (ahora sí: es el “terminé” que usan las campañas de WhatsApp)
- Limpia founder/employed: `startup_name`, `startup_stage`, `startup_industry`, `founder_role`, `employer_name`, `employer_role` → `null` (mismo cierre que el `updateProfile` seeker de una sola página)

Si el save falla, **no** va a `ConfirmationView`.

CV: `uploadCV` / `deleteCV` siguen igual (storage al instante). `cv_url` en la **fila** se persiste al guardar esta sección.

---

## 4. Qué no se borra

- Cada PATCH manda **solo** las columnas de esa sección.
- Campos de otras secciones quedan como están en Postgres.
- El form carga `initialData`. Si no tocan un campo de la sección actual, se reenvía el valor hidratado (no se “vacía” la DB).
- Vaciar a mano un input, desmarcar pills o deseleccionar fellowship **en esa sección** y dar Siguiente/Guardar sí escribe `""` / `[]` / `null`. El form lo permite; es un borrado explícito del usuario.
- Founder/employed no se limpian en Siguiente de 1 o 2. Solo en el guardado final de la sección 3 (completar como seeker), igual que el submit único de antes.

`profile_last_updated_at`: **solo** al terminar la sección 3 (seeker) o al submit de founder/employed. Abandonar en 1 o 2 deja respuestas guardadas pero **no** saca al maker de recordatorios de WhatsApp.

---

## 5. Founder y employed (sin wizard)

Siguen en **una sola página** debajo de “No busco trabajo”. Un solo `updateProfile` al final, con timestamp.

- Founder: nombre * y rol * obligatorios; etapa e industria opcionales. Limpia employer.
- Employed: empresa * y rol *. Limpia founder.
- No ven el wizard, ni `Paso X de 3`, ni la pregunta de graduación.
- No mandan `fellowship_graduated`: si alguna vez fue seeker, el valor previo **no se pisa**.

---

## 6. Campo `fellowship_graduated`

Solo UI de sección 3 seeker, después de Fortalezas.

| Acción | Valor |
| --- | --- |
| No toca la pregunta | `null` |
| “Sí, ya me gradué” | `true` |
| “Aún no” | `false` |
| Clic de nuevo en la opción ya seleccionada | `null` |

No bloquea “Guardar y activar”. Dashboard, campañas y `confirmation-view.tsx` **no lo listan** (el objeto TypeScript sí lo lleva).

Hidratación:

```ts
fellowship_graduated: maker.fellowship_graduated ?? null
```

`?? null` (no `?? false`): “no respondió” no se convierte en “no se graduó”.

---

## 7. Código

| Archivo | Rol |
| --- | --- |
| `app/perfil/[token]/actions.ts` | `updateProfile` (founder/employed). `updateSeekerSection(token, 1\|2\|3, data)` con allowlist. `ProfileData` incluye `fellowship_graduated`. |
| `app/perfil/[token]/profile-form.tsx` | `seekerStep` 0–3, cards por página, Atrás/Siguiente, persist solo al avanzar. |
| `app/perfil/[token]/page.tsx` | Hidrata `initialData`, incluido `fellowship_graduated`. |
| `components/profile-progress-bar.tsx` | `%` igual; prop opcional `step` / `stepCount` a la derecha. |
| `scripts/add_fellowship_graduated.sql` | Columna boolean nullable. Correr **a mano** en SQL Editor. |
| Este documento | Spec. |

**No se tocan (a propósito):** dashboard, campañas, `confirmation-view.tsx`, RLS, env vars, `lib/supabase/*`.

Auth de escritura: `service_role` + `.eq("magic_link_token", token)`. Sin filtro por `user_type` en el UPDATE: el token basta.

---

## 8. SQL `fellowship_graduated` (manual)

El app **no** crea la columna. Hay que correrlo en el SQL Editor de Supabase **antes** de que un seeker guarde la sección 3. Si no: error PostgREST “Could not find the `fellowship_graduated` column”. Founder/employed pueden guardar igual (no mandan esa columna). Siguiente de secciones 1–2 también (no la mandan).

```sql
ALTER TABLE placements_makers
  ADD COLUMN IF NOT EXISTS fellowship_graduated boolean;

COMMENT ON COLUMN placements_makers.fellowship_graduated
  IS 'true = Maker graduado / completó el fellowship; false = no; null = no respondió';
```

- Boolean nullable, **sin DEFAULT false** (el histórico no debe quedar como “no graduado”).
- `IF NOT EXISTS`: se puede repetir.
- RLS: sin cambios.

Verificación:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'placements_makers'
  AND column_name = 'fellowship_graduated';
```

Esperado: `boolean`, nullable, sin default.

---

## 9. Cómo probar

Magic link real en local:

1. Paso 0 → seeking: sección 1 aparece **sin** Siguiente en la pregunta 1; la fila no cambia.
2. Sección 1 vacía → Siguiente: solo esas columnas + status/type; `profile_last_updated_at` igual.
3. Cerrar y reabrir: datos de sección 1; UI en sección 1.
4. Atrás no escribe.
5. Sección 2 → Siguiente: tools/ciudad/empresa/salario; no pisa sección 1 ni CV.
6. Sección 3 → Guardar: timestamp, `cv_url`, fellowship, `ConfirmationView`.
7. Save que falla: no avanza.
8. “No busco” → founder/employed: una página, un guardado, sin “Paso X de 3”.
9. Maker con datos previos: pills precargados; Next de una sección no vacía las otras.
10. Fellowship: no tocar → `null`; “Sí” → `true`; recargar → sigue en “Sí”.
