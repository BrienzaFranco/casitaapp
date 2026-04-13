create extension if not exists pgcrypto;

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid,
  nombre text unique not null,
  color text not null default '#6366f1',
  limite_mensual numeric,
  es_fijo boolean not null default false,
  creado_en timestamptz not null default now()
);

create table if not exists subcategorias (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias(id) on delete cascade,
  nombre text not null,
  limite_mensual numeric,
  creado_en timestamptz not null default now(),
  unique(categoria_id, nombre)
);

create table if not exists etiquetas (
  id uuid primary key default gen_random_uuid(),
  nombre text unique not null,
  color text not null default '#f59e0b'
);

create table if not exists compras (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid,
  fecha date not null default current_date,
  nombre_lugar text,
  notas text,
  registrado_por text not null,
  pagador_general text not null default 'compartido' check (pagador_general in ('franco', 'fabiola', 'compartido')),
  estado text not null default 'confirmada' check (estado in ('borrador', 'confirmada')),
  creado_en timestamptz not null default now()
);

alter table compras
add column if not exists pagador_general text not null default 'compartido';

alter table compras
add column if not exists estado text not null default 'confirmada';

update compras
set pagador_general = 'compartido'
where pagador_general is null;

update compras
set estado = 'confirmada'
where estado is null;

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references compras(id) on delete cascade,
  hogar_id uuid,
  categoria_id uuid references categorias(id),
  subcategoria_id uuid references subcategorias(id),
  descripcion text,
  expresion_monto text not null,
  monto_resuelto numeric not null,
  tipo_reparto text not null default '50/50',
  pago_franco numeric not null default 0,
  pago_fabiola numeric not null default 0,
  creado_en timestamptz not null default now()
);

create table if not exists item_etiquetas (
  item_id uuid not null references items(id) on delete cascade,
  etiqueta_id uuid not null references etiquetas(id),
  primary key(item_id, etiqueta_id)
);

create table if not exists compra_etiquetas (
  compra_id uuid not null references compras(id) on delete cascade,
  etiqueta_id uuid not null references etiquetas(id),
  primary key(compra_id, etiqueta_id)
);

create table if not exists settlement_cuts (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid,
  fecha_corte date not null,
  nota text not null default '',
  activo boolean not null default false,
  actualizado_por text not null,
  creado_en timestamptz not null default now()
);

create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_subcategorias_categoria_id on subcategorias(categoria_id);
create index if not exists idx_items_compra_id on items(compra_id);
create index if not exists idx_items_categoria_id on items(categoria_id);
create index if not exists idx_items_subcategoria_id on items(subcategoria_id);
create index if not exists idx_item_etiquetas_etiqueta_id on item_etiquetas(etiqueta_id);
create index if not exists idx_compra_etiquetas_etiqueta_id on compra_etiquetas(etiqueta_id);
create index if not exists idx_settlement_cuts_fecha on settlement_cuts(fecha_corte desc);
create index if not exists idx_settlement_cuts_activo on settlement_cuts(activo);
create index if not exists idx_compras_fecha on compras(fecha desc);

create or replace function public.sincronizar_perfil_desde_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set nombre = excluded.nombre;

  return new;
end;
$$;

drop trigger if exists trigger_sincronizar_perfil_desde_auth on auth.users;
create trigger trigger_sincronizar_perfil_desde_auth
after insert or update on auth.users
for each row
execute function public.sincronizar_perfil_desde_auth();

create or replace function public.crear_compra_borrador(
  p_fecha date,
  p_nombre_lugar text,
  p_notas text,
  p_registrado_por text,
  p_hogar_id uuid,
  p_pagador_general text default 'compartido'
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_compra_id uuid;
begin
  insert into compras (
    fecha,
    nombre_lugar,
    notas,
    registrado_por,
    hogar_id,
    pagador_general,
    estado
  )
  values (
    p_fecha,
    p_nombre_lugar,
    p_notas,
    p_registrado_por,
    p_hogar_id,
    coalesce(nullif(p_pagador_general, ''), 'compartido'),
    'borrador'
  )
  returning id into v_compra_id;

  return v_compra_id;
end;
$$;

create or replace function public.guardar_compra_borrador(
  p_compra_id uuid default null,
  p_fecha date default current_date,
  p_nombre_lugar text default null,
  p_notas text default null,
  p_registrado_por text default '',
  p_hogar_id uuid default null,
  p_items jsonb default '[]'::jsonb,
  p_pagador_general text default 'compartido',
  p_etiquetas_compra_ids uuid[] default array[]::uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_compra_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_etiqueta_id uuid;
  v_compra_etiqueta_id uuid;
begin
  if p_compra_id is null then
    insert into compras (
      fecha,
      nombre_lugar,
      notas,
      registrado_por,
      hogar_id,
      pagador_general,
      estado
    )
    values (
      p_fecha,
      p_nombre_lugar,
      p_notas,
      p_registrado_por,
      p_hogar_id,
      coalesce(nullif(p_pagador_general, ''), 'compartido'),
      'borrador'
    )
    returning id into v_compra_id;
  else
    update compras
    set
      fecha = p_fecha,
      nombre_lugar = p_nombre_lugar,
      notas = p_notas,
      registrado_por = p_registrado_por,
      hogar_id = p_hogar_id,
      pagador_general = coalesce(nullif(p_pagador_general, ''), 'compartido'),
      estado = 'borrador'
    where id = p_compra_id
    returning id into v_compra_id;

    if v_compra_id is null then
      raise exception 'Compra no encontrada';
    end if;
  end if;

  delete from compra_etiquetas where compra_id = v_compra_id;

  if p_etiquetas_compra_ids is not null then
    foreach v_compra_etiqueta_id in array p_etiquetas_compra_ids
    loop
      insert into compra_etiquetas (compra_id, etiqueta_id)
      values (v_compra_id, v_compra_etiqueta_id)
      on conflict do nothing;
    end loop;
  end if;

  delete from items where compra_id = v_compra_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    insert into items (
      compra_id,
      hogar_id,
      categoria_id,
      subcategoria_id,
      descripcion,
      expresion_monto,
      monto_resuelto,
      tipo_reparto,
      pago_franco,
      pago_fabiola
    )
    values (
      v_compra_id,
      p_hogar_id,
      nullif(v_item ->> 'categoria_id', '')::uuid,
      nullif(v_item ->> 'subcategoria_id', '')::uuid,
      nullif(v_item ->> 'descripcion', ''),
      coalesce(nullif(v_item ->> 'expresion_monto', ''), '0'),
      coalesce((v_item ->> 'monto_resuelto')::numeric, 0),
      coalesce(nullif(v_item ->> 'tipo_reparto', ''), '50/50'),
      coalesce((v_item ->> 'pago_franco')::numeric, 0),
      coalesce((v_item ->> 'pago_fabiola')::numeric, 0)
    )
    returning id into v_item_id;

    for v_etiqueta_id in
      select jsonb_array_elements_text(coalesce(v_item -> 'etiquetas_ids', '[]'::jsonb))::uuid
    loop
      insert into item_etiquetas (item_id, etiqueta_id)
      values (v_item_id, v_etiqueta_id)
      on conflict do nothing;
    end loop;
  end loop;

  return v_compra_id;
end;
$$;

create or replace function public.crear_compra_completa(
  p_fecha date,
  p_nombre_lugar text,
  p_notas text,
  p_registrado_por text,
  p_hogar_id uuid,
  p_items jsonb,
  p_pagador_general text default 'compartido',
  p_etiquetas_compra_ids uuid[] default array[]::uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_compra_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_etiqueta_id uuid;
  v_compra_etiqueta_id uuid;
begin
  insert into compras (fecha, nombre_lugar, notas, registrado_por, hogar_id, pagador_general, estado)
  values (
    p_fecha,
    p_nombre_lugar,
    p_notas,
    p_registrado_por,
    p_hogar_id,
    coalesce(nullif(p_pagador_general, ''), 'compartido'),
    'confirmada'
  )
  returning id into v_compra_id;

  if p_etiquetas_compra_ids is not null then
    foreach v_compra_etiqueta_id in array p_etiquetas_compra_ids
    loop
      insert into compra_etiquetas (compra_id, etiqueta_id)
      values (v_compra_id, v_compra_etiqueta_id)
      on conflict do nothing;
    end loop;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into items (
      compra_id,
      hogar_id,
      categoria_id,
      subcategoria_id,
      descripcion,
      expresion_monto,
      monto_resuelto,
      tipo_reparto,
      pago_franco,
      pago_fabiola
    )
    values (
      v_compra_id,
      p_hogar_id,
      nullif(v_item ->> 'categoria_id', '')::uuid,
      nullif(v_item ->> 'subcategoria_id', '')::uuid,
      v_item ->> 'descripcion',
      v_item ->> 'expresion_monto',
      (v_item ->> 'monto_resuelto')::numeric,
      v_item ->> 'tipo_reparto',
      (v_item ->> 'pago_franco')::numeric,
      (v_item ->> 'pago_fabiola')::numeric
    )
    returning id into v_item_id;

    for v_etiqueta_id in
      select jsonb_array_elements_text(coalesce(v_item -> 'etiquetas_ids', '[]'::jsonb))::uuid
    loop
      insert into item_etiquetas (item_id, etiqueta_id)
      values (v_item_id, v_etiqueta_id)
      on conflict do nothing;
    end loop;
  end loop;

  return v_compra_id;
end;
$$;

create or replace function public.actualizar_compra_completa(
  p_compra_id uuid,
  p_fecha date,
  p_nombre_lugar text,
  p_notas text,
  p_registrado_por text,
  p_hogar_id uuid,
  p_items jsonb,
  p_pagador_general text default 'compartido',
  p_etiquetas_compra_ids uuid[] default array[]::uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item jsonb;
  v_item_id uuid;
  v_etiqueta_id uuid;
  v_compra_etiqueta_id uuid;
begin
  update compras
  set
    fecha = p_fecha,
    nombre_lugar = p_nombre_lugar,
    notas = p_notas,
    registrado_por = p_registrado_por,
    hogar_id = p_hogar_id,
    pagador_general = coalesce(nullif(p_pagador_general, ''), 'compartido'),
    estado = 'confirmada'
  where id = p_compra_id;

  delete from compra_etiquetas where compra_id = p_compra_id;

  if p_etiquetas_compra_ids is not null then
    foreach v_compra_etiqueta_id in array p_etiquetas_compra_ids
    loop
      insert into compra_etiquetas (compra_id, etiqueta_id)
      values (p_compra_id, v_compra_etiqueta_id)
      on conflict do nothing;
    end loop;
  end if;

  delete from items where compra_id = p_compra_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into items (
      compra_id,
      hogar_id,
      categoria_id,
      subcategoria_id,
      descripcion,
      expresion_monto,
      monto_resuelto,
      tipo_reparto,
      pago_franco,
      pago_fabiola
    )
    values (
      p_compra_id,
      p_hogar_id,
      nullif(v_item ->> 'categoria_id', '')::uuid,
      nullif(v_item ->> 'subcategoria_id', '')::uuid,
      v_item ->> 'descripcion',
      v_item ->> 'expresion_monto',
      (v_item ->> 'monto_resuelto')::numeric,
      v_item ->> 'tipo_reparto',
      (v_item ->> 'pago_franco')::numeric,
      (v_item ->> 'pago_fabiola')::numeric
    )
    returning id into v_item_id;

    for v_etiqueta_id in
      select jsonb_array_elements_text(coalesce(v_item -> 'etiquetas_ids', '[]'::jsonb))::uuid
    loop
      insert into item_etiquetas (item_id, etiqueta_id)
      values (v_item_id, v_etiqueta_id)
      on conflict do nothing;
    end loop;
  end loop;

  return p_compra_id;
end;
$$;

alter table categorias enable row level security;
alter table subcategorias enable row level security;
alter table etiquetas enable row level security;
alter table compras enable row level security;
alter table items enable row level security;
alter table item_etiquetas enable row level security;
alter table compra_etiquetas enable row level security;
alter table perfiles enable row level security;
alter table settlement_cuts enable row level security;

drop policy if exists categorias_autenticados on categorias;
create policy categorias_autenticados on categorias
for all to authenticated
using (true)
with check (true);

drop policy if exists subcategorias_autenticados on subcategorias;
create policy subcategorias_autenticados on subcategorias
for all to authenticated
using (true)
with check (true);

drop policy if exists etiquetas_autenticados on etiquetas;
create policy etiquetas_autenticados on etiquetas
for all to authenticated
using (true)
with check (true);

drop policy if exists compras_autenticados on compras;
create policy compras_autenticados on compras
for all to authenticated
using (true)
with check (true);

drop policy if exists items_autenticados on items;
create policy items_autenticados on items
for all to authenticated
using (true)
with check (true);

drop policy if exists item_etiquetas_autenticados on item_etiquetas;
create policy item_etiquetas_autenticados on item_etiquetas
for all to authenticated
using (true)
with check (true);

drop policy if exists compra_etiquetas_autenticados on compra_etiquetas;
create policy compra_etiquetas_autenticados on compra_etiquetas
for all to authenticated
using (true)
with check (true);

drop policy if exists perfiles_autenticados on perfiles;
create policy perfiles_autenticados on perfiles
for all to authenticated
using (true)
with check (true);

drop policy if exists settlement_cuts_autenticados on settlement_cuts;
create policy settlement_cuts_autenticados on settlement_cuts
for all to authenticated
using (true)
with check (true);

insert into categorias (nombre, color)
values
  ('Vivienda', '#6366f1'),
  ('Alimentos', '#10b981'),
  ('Higiene y cuidado personal', '#f472b6'),
  ('Transporte', '#f59e0b'),
  ('Salud', '#ef4444'),
  ('Servicios', '#8b5cf6'),
  ('Educacion', '#0ea5e9'),
  ('Ropa y calzado', '#ec4899'),
  ('Mascota', '#84cc16'),
  ('Entretenimiento', '#14b8a6'),
  ('Deportes', '#22c55e'),
  ('Regalos', '#fb7185'),
  ('Hogar y equipamiento', '#a855f7'),
  ('Finanzas y cuotas', '#64748b'),
  ('Impuestos y obligaciones', '#f97316'),
  ('Otros', '#6b7280')
on conflict (nombre) do update
set color = excluded.color;

-- Marcar categorias fijas (gastos recurrentes mes a mes)
update categorias set es_fijo = true where nombre in ('Vivienda', 'Servicios');

with categorias_base as (
  select id, nombre from categorias
)
insert into subcategorias (categoria_id, nombre)
select categorias_base.id, datos.nombre
from categorias_base
join (
  values
    ('Vivienda', 'Alquiler'),
    ('Vivienda', 'Expensas'),
    ('Vivienda', 'Seguro de incendio'),
    ('Vivienda', 'Servicios de vivienda'),
    ('Alimentos', 'Almacen'),
    ('Alimentos', 'Bebidas'),
    ('Alimentos', 'Cafe'),
    ('Alimentos', 'Carniceria'),
    ('Alimentos', 'Comida hecha'),
    ('Alimentos', 'Feria'),
    ('Alimentos', 'Panaderia'),
    ('Alimentos', 'Snacks y galletitas'),
    ('Alimentos', 'Supermercado'),
    ('Alimentos', 'Verduleria'),
    ('Alimentos', 'Aceite'),
    ('Alimentos', 'Huevos'),
    ('Alimentos', 'Yerba'),
    ('Higiene y cuidado personal', 'Articulos de limpieza'),
    ('Higiene y cuidado personal', 'Estetica'),
    ('Higiene y cuidado personal', 'Higiene personal'),
    ('Higiene y cuidado personal', 'Maquillaje'),
    ('Higiene y cuidado personal', 'Shampoo'),
    ('Transporte', 'Nafta'),
    ('Transporte', 'Peaje'),
    ('Transporte', 'SUBE'),
    ('Transporte', 'Seguro automotor'),
    ('Transporte', 'Multas'),
    ('Transporte', 'Patente'),
    ('Transporte', 'Arreglo'),
    ('Transporte', 'Remis'),
    ('Salud', 'Medico'),
    ('Salud', 'Farmacia'),
    ('Salud', 'Anticonceptivas'),
    ('Servicios', 'Internet'),
    ('Servicios', 'Spotify'),
    ('Servicios', 'Suscripciones'),
    ('Educacion', 'UTN'),
    ('Educacion', 'Cursos'),
    ('Educacion', 'Libros'),
    ('Ropa y calzado', 'Ropa'),
    ('Ropa y calzado', 'Zapatillas'),
    ('Mascota', 'Alimento balanceado'),
    ('Mascota', 'Veterinaria'),
    ('Mascota', 'Juguetes y accesorios'),
    ('Mascota', 'Piedritas'),
    ('Entretenimiento', 'Salidas'),
    ('Entretenimiento', 'Eventos'),
    ('Entretenimiento', 'Juegos'),
    ('Deportes', 'Gimnasio'),
    ('Deportes', 'Futbol'),
    ('Deportes', 'Equipamiento'),
    ('Regalos', 'Regalos personales'),
    ('Hogar y equipamiento', 'Bazar'),
    ('Hogar y equipamiento', 'Cocina'),
    ('Hogar y equipamiento', 'Decoracion'),
    ('Hogar y equipamiento', 'Electrodomesticos'),
    ('Hogar y equipamiento', 'Muebles'),
    ('Hogar y equipamiento', 'Ferreteria y reparaciones'),
    ('Hogar y equipamiento', 'Easy'),
    ('Finanzas y cuotas', 'Cuotas'),
    ('Finanzas y cuotas', 'Monotributo'),
    ('Finanzas y cuotas', 'Contadora'),
    ('Impuestos y obligaciones', 'Impuestos varios'),
    ('Otros', 'Varios')
) as datos(categoria, nombre) on datos.categoria = categorias_base.nombre
on conflict (categoria_id, nombre) do nothing;

insert into etiquetas (nombre, color)
values
  ('IMPREVISTO', '#ef4444'),
  ('VACACIONES', '#0ea5e9'),
  ('REGALO', '#ec4899'),
  ('MEDICO URGENCIA', '#f97316'),
  ('NAVIDAD', '#dc2626'),
  ('MUDANZA', '#8b5cf6'),
  ('MASCOTA URGENCIA', '#84cc16')
on conflict (nombre) do update
set color = excluded.color;

-- Despues de crear los usuarios en Supabase Auth, ajustar estos nombres si hace falta.
-- update perfiles set nombre = 'Franco' where id = 'UUID_DE_FRANCO';
-- update perfiles set nombre = 'Fabiola' where id = 'UUID_DE_FABIOLA';
