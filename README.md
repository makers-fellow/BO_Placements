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

### Campañas de WhatsApp (`/campaigns`, solo admin)
- Lista makers cuyo perfil no se ha actualizado en 30/60/90 días (basado en `profile_last_updated_at`, con fallback a `updated_at`), excluyendo por defecto `user_type = 'employed'` y `search_status = 'not_looking'`.
- Permite elegir un template aprobado de WhatsApp (vía [Kapso](https://kapso.ai), proxy de la API de WhatsApp Cloud de Meta) y enviarlo masivamente a los makers seleccionados como recordatorio para que verifiquen si siguen buscando trabajo.
- El template debe usar los parámetros nombrados `first_name` y `profile_url`; ambos se completan automáticamente con el link mágico del maker.
- Cada envío queda registrado en `whatsapp_campaigns` / `whatsapp_campaign_messages`, y actualiza `placements_makers.last_reminder_sent_at` para evitar reenvíos innecesarios.
- El envío va **por lotes**: `createCampaign` crea la campaña con un mensaje `pending` por destinatario y el cliente llama a `sendCampaignBatch` en bucle (25 por request) hasta terminar. Como cada lote toma los que siguen en `pending`, un envío interrumpido se reanuda sin duplicar mensajes.
- `app/api/whatsapp/webhook/route.ts` recibe los eventos de Kapso (`whatsapp.message.delivered/read/failed`), valida la firma HMAC con `KAPSO_WEBHOOK_SECRET` y actualiza el estado real de cada mensaje. Hay que registrarlo en Kapso como webhook **del número de teléfono** (los eventos de mensajes no llegan por webhooks de proyecto) apuntando a `https://<host>/api/whatsapp/webhook`.
- Los templates se crean y aprueban fuera de la app, en el dashboard de Kapso/Meta — la app solo los lista y los usa para enviar.

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
  campaigns/        # campañas de WhatsApp vía Kapso (solo admin)
  perfil/[token]/   # formulario público de perfil (magic link)
  page.tsx          # dashboard principal de candidatos
components/ui/      # componentes shadcn/ui
lib/supabase/        # clientes Supabase (browser y server)
lib/kapso/            # cliente Kapso + helpers de templates de WhatsApp
scripts/              # migraciones SQL para correr manualmente en Supabase
middleware.ts          # protección de rutas + refresco de sesión
```

## Base de datos (Supabase)

Tablas principales:
- **`placements_makers`**: datos de cada maker/candidato, incluye `magic_link_token`, `user_type`, `search_status` (enum), y columnas condicionales de founder/employed.
- **`dashboard_users`**: usuarios del dashboard interno, vinculados a `auth.users` vía `auth_id`, con `status` (`pending`/`approved`/`rejected`) y `role` (`viewer`/`admin`).
- **`whatsapp_campaigns`** / **`whatsapp_campaign_messages`**: historial de campañas de recordatorio por WhatsApp y el estado de envío por destinatario.

Las migraciones en `scripts/*.sql` no se aplican automáticamente — hay que correrlas manualmente en el SQL Editor de Supabase:
- `auth_setup.sql` — crea `dashboard_users` + políticas RLS
- `enable_rls_policies.sql` — políticas RLS originales de `placements_makers` (lectura y update públicos) — **reemplazado por los `lock_down_*.sql`**
- `lock_down_placements_rls.sql` — cierra `placements_makers` a `anon`/`authenticated`; el acceso pasa a ser server-side con `service_role`
- `lock_down_cv_storage.sql` — bucket `CVs Makers` privado + quita las policies públicas (incluida DELETE)
- `audit_magic_link_tokens.sql` — diagnóstico (solo lectura) de la entropía de los tokens
- `add_user_type_columns.sql` — columnas de flujo condicional seeker/founder/employed
- `add_not_looking_enum.sql` — agrega el valor `not_looking` al enum `search_status`
- `create_whatsapp_campaigns.sql` — tablas de campañas de WhatsApp + columna `last_reminder_sent_at` en `placements_makers`
- `add_whatsapp_delivery_status.sql` — estados `delivered`/`read`, contadores por campaña y la función `increment_campaign_counter` (correr después de `create_whatsapp_campaigns.sql`)

## Desarrollo local

```bash
npm install   # o pnpm install (hay lockfiles de ambos)
npm run dev
```

### Variables de entorno requeridas (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=       # usado como emailRedirectTo en el registro y en los links de perfil enviados por WhatsApp

# Kapso (WhatsApp) — server-only, nunca exponer con NEXT_PUBLIC_
KAPSO_API_KEY=
KAPSO_PHONE_NUMBER_ID=      # phone_number_id de Meta (número conectado en Kapso)
KAPSO_BUSINESS_ACCOUNT_ID=  # WABA id, necesario para listar templates
KAPSO_WEBHOOK_SECRET=       # secreto del webhook de Kapso, para validar la firma HMAC

SUPABASE_SERVICE_ROLE_KEY=  # server-only; obligatorio: todo acceso a placements_makers y al bucket de CVs pasa por él
```

## Notas

- `next.config.mjs` tiene `typescript.ignoreBuildErrors: true` e `images.unoptimized: true`.
- `placements_makers` y el bucket `CVs Makers` están cerrados a los roles `anon`/`authenticated`: ninguna consulta sale del navegador, todo pasa por el servidor con `service_role` y cada caller autoriza antes (sesión + rol en el dashboard, `magic_link_token` en `/perfil`). Los CVs se sirven con signed URLs.
- La seguridad del perfil del maker sigue dependiendo de que el `magic_link_token` sea difícil de adivinar, no de autenticación real — pero los tokens ya no son legibles desde fuera. Correr `scripts/audit_magic_link_tokens.sql` para verificar su entropía.
