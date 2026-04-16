-- ============================================
-- MIGRACION: Telemetria de Chat IA + Flags
-- Ejecutar en Supabase SQL Editor
-- ============================================

create table if not exists ia_logs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  modo text not null check (modo in ('rapido', 'completo')),
  intent text not null,
  can_save boolean not null default false,
  campos_completados int not null default 0,
  faltantes_count int not null default 0,
  latencia_ms int not null default 0,
  modelo text not null,
  prompt_version text not null default 'v2',
  retry_count int not null default 0,
  provider_status int not null default 0,
  fallback_used boolean not null default false,
  error_code text,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  tokens_total int not null default 0,
  costo_est_usd numeric not null default 0,
  creado_en timestamptz not null default now()
);

create index if not exists idx_ia_logs_creado_en on ia_logs(creado_en desc);
create index if not exists idx_ia_logs_session on ia_logs(session_id);
create index if not exists idx_ia_logs_user on ia_logs(user_id);
create index if not exists idx_ia_logs_intent on ia_logs(intent);

alter table ia_logs enable row level security;

drop policy if exists ia_logs_autenticados on ia_logs;
create policy ia_logs_autenticados on ia_logs
for all to authenticated
using (true)
with check (true);

insert into configuracion (clave, valor)
values
  ('ia_prompt_version', '"v2"'),
  ('ia_prompt_v2_enabled', 'true'),
  ('ia_network_guard_enabled', 'true'),
  ('ia_history_enabled', 'true'),
  ('ia_catalog_compact_enabled', 'true'),
  ('ia_fullmode_question_planner_v2', 'true')
on conflict (clave) do nothing;
