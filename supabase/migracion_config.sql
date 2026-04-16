-- ============================================
-- MIGRACION: Tabla configuracion compartida
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla de configuracion clave-valor compartida entre usuarios
create table if not exists configuracion (
  clave text primary key,
  valor jsonb not null default '{}',
  actualizado_por text,
  actualizado_en timestamptz not null default now()
);

-- Politicas RLS: todos los autenticados pueden leer y escribir
alter table configuracion enable row level security;

drop policy if exists configuracion_autenticados on configuracion;
create policy configuracion_autenticados on configuracion
for all to authenticated
using (true)
with check (true);

-- Semillas iniciales
insert into configuracion (clave, valor)
values
  ('colores_personas', '{"franco": "#3b82f6", "fabiola": "#10b981"}'),
  ('lugares_ocultos', '[]'),
  ('ia_modelo_openrouter', '"minimax/minimax-m2.7"'),
  ('ia_prompt_version', '"v2"'),
  ('ia_prompt_v2_enabled', 'true'),
  ('ia_network_guard_enabled', 'true'),
  ('ia_history_enabled', 'true'),
  ('ia_catalog_compact_enabled', 'true'),
  ('ia_fullmode_question_planner_v2', 'true')
on conflict (clave) do nothing;
