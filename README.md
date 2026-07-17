# BO Placements

Panel interno de Makers Fellowship para gestionar candidatos ("makers") en proceso de colocación laboral. Los makers actualizan su propio perfil mediante un enlace mágico (sin login), y el equipo de Makers accede a un dashboard autenticado para revisar candidatos.

- **Repo:** [makers-fellow/BO_Placements](https://github.com/makers-fellow/BO_Placements)
- **Stack:** Next.js 16 (App Router) + TypeScript + Supabase (Auth + Postgres) + Tailwind + shadcn/ui (Radix)
- **Deploy:** Vercel (proyecto generado/editado originalmente con [v0.dev](https://v0.dev))

## Funcionalidad

### Dashboard interno (`/`, `/admin`)
- Login/registro con Supabase Auth (`app/(auth)/`).
- Los usuarios nuevos quedan en estado `pending` en la tabla `dashboard_users` y necesitan aprobación de un admin (`app/admin/`) antes de ver la tabla de candidatos.
- Roles: `viewer` (solo lectura de candidatos) y `admin` (aprueba/rechaza usuarios).
- `middleware.ts` protege todas las rutas excepto `/login`, `/register`, `/perfil/*` y `/auth/*`.
- `app/candidates-table.tsx` lista los candidatos de la tabla `placements_makers` con filtros por cohorte, ordenamiento por última actualización, y botón directo a WhatsApp.

### Perfil público del maker (`/perfil/[token]`)
- Cada maker recibe un enlace único con un `magic_link_token` (columna en `placements_makers`) que le permite editar su propio perfil **sin necesidad de cuenta/login**.
- Formulario condicional (`app/perfil/[token]/profile-form.tsx`) según `user_type`:
  - **seeker**: busca trabajo (rol, seniority, industrias, herramientas, salario, etc.)
  - **founder**: fundador de startup (nombre, etapa, industria, rol)
  - **employed**: ya empleado (empresa, rol actual)
- Confirmación visual al guardar (`confirmation-view.tsx`).

## Estructura del proyecto

```
app/
  (auth)/          # login, registro, server actions de auth
  admin/            # panel de aprobación de usuarios (solo admin)
  auth/callback/    # callback de confirmación de email (Supabase)
  perfil/[token]/   # formulario público de perfil (magic link)
  page.tsx          # dashboard principal de candidatos
components/ui/      # componentes shadcn/ui
lib/supabase/        # clientes Supabase (browser y server)
scripts/              # migraciones SQL para correr manualmente en Supabase
middleware.ts          # protección de rutas + refresco de sesión
```

## Base de datos (Supabase)

Tablas principales:
- **`placements_makers`**: datos de cada maker/candidato, incluye `magic_link_token`, `user_type`, `search_status` (enum), y columnas condicionales de founder/employed.
- **`dashboard_users`**: usuarios del dashboard interno, vinculados a `auth.users` vía `auth_id`, con `status` (`pending`/`approved`/`rejected`) y `role` (`viewer`/`admin`).

Las migraciones en `scripts/*.sql` no se aplican automáticamente — hay que correrlas manualmente en el SQL Editor de Supabase:
- `auth_setup.sql` — crea `dashboard_users` + políticas RLS
- `enable_rls_policies.sql` — políticas RLS de `placements_makers` (lectura pública, update vía token)
- `add_user_type_columns.sql` — columnas de flujo condicional seeker/founder/employed
- `add_not_looking_enum.sql` — agrega el valor `not_looking` al enum `search_status`

## Desarrollo local

```bash
npm install   # o pnpm install (hay lockfiles de ambos)
npm run dev
```

### Variables de entorno requeridas (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=       # usado como emailRedirectTo en el registro
```

## Notas

- `next.config.mjs` tiene `typescript.ignoreBuildErrors: true` e `images.unoptimized: true`.
- El acceso de lectura/escritura a `placements_makers` vía RLS es público (`USING (true)`) — la seguridad del perfil depende de que el `magic_link_token` sea difícil de adivinar, no de autenticación real.
