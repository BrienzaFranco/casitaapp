-- ============================================
-- RESET COMPLETO DE BASE DE DATOS
-- Ejecutar en Supabase SQL Editor
-- Esto BORRA todos los datos y recrea la estructura
-- ============================================

-- 1. Eliminar tablas existentes (orden inverso a dependencias)
drop table if exists configuracion cascade;
drop table if exists item_etiquetas cascade;
drop table if exists compra_etiquetas cascade;
drop table if exists items cascade;
drop table if exists compras cascade;
drop table if exists subcategorias cascade;
drop table if exists categorias cascade;
drop table if exists etiquetas cascade;
drop table if exists settlement_cuts cascade;

-- 2. Recrear tablas
create table categorias (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid,
  nombre text unique not null,
  color text not null default '#6366f1',
  limite_mensual numeric,
  creado_en timestamptz not null default now()
);

create table subcategorias (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias(id) on delete cascade,
  nombre text not null,
  limite_mensual numeric,
  creado_en timestamptz not null default now(),
  unique(categoria_id, nombre)
);

create table etiquetas (
  id uuid primary key default gen_random_uuid(),
  nombre text unique not null,
  color text not null default '#f59e0b'
);

create table compras (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  hogar_id uuid,
  nombre_lugar text,
  notas text,
  registrado_por text not null,
  pagador_general text not null default 'compartido' check (pagador_general in ('franco', 'fabiola', 'compartido')),
  estado text not null default 'confirmada' check (estado in ('borrador', 'confirmada')),
  creado_en timestamptz not null default now()
);

create table items (
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

create table item_etiquetas (
  item_id uuid not null references items(id) on delete cascade,
  etiqueta_id uuid not null references etiquetas(id),
  primary key(item_id, etiqueta_id)
);

create table compra_etiquetas (
  compra_id uuid not null references compras(id) on delete cascade,
  etiqueta_id uuid not null references etiquetas(id),
  primary key(compra_id, etiqueta_id)
);

create table settlement_cuts (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid,
  fecha_corte date not null,
  nota text not null default '',
  activo boolean not null default false,
  actualizado_por text not null,
  creado_en timestamptz not null default now()
);

create table configuracion (
  clave text primary key,
  valor jsonb not null default '{}',
  actualizado_por text,
  actualizado_en timestamptz not null default now()
);

-- Indices
create index idx_subcategorias_categoria_id on subcategorias(categoria_id);
create index idx_items_compra_id on items(compra_id);
create index idx_items_categoria_id on items(categoria_id);
create index idx_items_subcategoria_id on items(subcategoria_id);
create index idx_item_etiquetas_etiqueta_id on item_etiquetas(etiqueta_id);
create index idx_compra_etiquetas_etiqueta_id on compra_etiquetas(etiqueta_id);
create index idx_compras_fecha on compras(fecha desc);
create index idx_settlement_cuts_fecha on settlement_cuts(fecha_corte desc);
create index idx_settlement_cuts_activo on settlement_cuts(activo);

-- RLS Policies
alter table categorias enable row level security;
alter table subcategorias enable row level security;
alter table etiquetas enable row level security;
alter table compras enable row level security;
alter table items enable row level security;
alter table item_etiquetas enable row level security;
alter table compra_etiquetas enable row level security;
alter table settlement_cuts enable row level security;
alter table configuracion enable row level security;

drop policy if exists categorias_autenticados on categorias;
create policy categorias_autenticados on categorias for all to authenticated using (true) with check (true);

drop policy if exists subcategorias_autenticados on subcategorias;
create policy subcategorias_autenticados on subcategorias for all to authenticated using (true) with check (true);

drop policy if exists etiquetas_autenticados on etiquetas;
create policy etiquetas_autenticados on etiquetas for all to authenticated using (true) with check (true);

drop policy if exists compras_autenticados on compras;
create policy compras_autenticados on compras for all to authenticated using (true) with check (true);

drop policy if exists items_autenticados on items;
create policy items_autenticados on items for all to authenticated using (true) with check (true);

drop policy if exists item_etiquetas_autenticados on item_etiquetas;
create policy item_etiquetas_autenticados on item_etiquetas for all to authenticated using (true) with check (true);

drop policy if exists compra_etiquetas_autenticados on compra_etiquetas;
create policy compra_etiquetas_autenticados on compra_etiquetas for all to authenticated using (true) with check (true);

drop policy if exists settlement_cuts_autenticados on settlement_cuts;
create policy settlement_cuts_autenticados on settlement_cuts for all to authenticated using (true) with check (true);

drop policy if exists configuracion_autenticados on configuracion;
create policy configuracion_autenticados on configuracion for all to authenticated using (true) with check (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Categorias
insert into categorias (nombre, color, limite_mensual) values
  ('Vivienda', '#6366f1', null),
  ('Alimentos', '#10b981', null),
  ('Higiene y cuidado personal', '#f472b6', null),
  ('Transporte', '#f59e0b', null),
  ('Salud', '#ef4444', null),
  ('Servicios', '#8b5cf6', null),
  ('Educacion', '#0ea5e9', null),
  ('Ropa y calzado', '#ec4899', null),
  ('Mascota', '#84cc16', null),
  ('Entretenimiento', '#14b8a6', null),
  ('Deportes', '#22c55e', null),
  ('Regalos', '#fb7185', null),
  ('Hogar y equipamiento', '#a855f7', null),
  ('Finanzas y cuotas', '#64748b', null),
  ('Impuestos y obligaciones', '#f97316', null),
  ('Otros', '#6b7280', null)
on conflict (nombre) do update set color = excluded.color;

-- Subcategorias
insert into subcategorias (categoria_id, nombre)
select c.id, datos.nombre
from categorias c
join (
  values
    ('Vivienda', 'Alquiler'), ('Vivienda', 'Expensas'), ('Vivienda', 'Seguro de incendio'), ('Vivienda', 'Servicios de vivienda'),
    ('Alimentos', 'Almacen'), ('Alimentos', 'Bebidas'), ('Alimentos', 'Cafe'), ('Alimentos', 'Carniceria'),
    ('Alimentos', 'Comida hecha'), ('Alimentos', 'Feria'), ('Alimentos', 'Panaderia'), ('Alimentos', 'Snacks y galletitas'),
    ('Alimentos', 'Supermercado'), ('Alimentos', 'Verduleria'), ('Alimentos', 'Aceite'), ('Alimentos', 'Huevos'), ('Alimentos', 'Yerba'),
    ('Higiene y cuidado personal', 'Articulos de limpieza'), ('Higiene y cuidado personal', 'Estetica'),
    ('Higiene y cuidado personal', 'Higiene personal'), ('Higiene y cuidado personal', 'Maquillaje'), ('Higiene y cuidado personal', 'Shampoo'),
    ('Transporte', 'Nafta'), ('Transporte', 'Peaje'), ('Transporte', 'SUBE'), ('Transporte', 'Seguro automotor'),
    ('Transporte', 'Multas'), ('Transporte', 'Patente'), ('Transporte', 'Arreglo'), ('Transporte', 'Remis'),
    ('Salud', 'Medico'), ('Salud', 'Farmacia'), ('Salud', 'Anticonceptivas'),
    ('Servicios', 'Internet'), ('Servicios', 'Spotify'), ('Servicios', 'Suscripciones'),
    ('Educacion', 'UTN'), ('Educacion', 'Cursos'), ('Educacion', 'Libros'),
    ('Ropa y calzado', 'Ropa'), ('Ropa y calzado', 'Zapatillas'),
    ('Mascota', 'Alimento balanceado'), ('Mascota', 'Veterinaria'), ('Mascota', 'Juguetes y accesorios'), ('Mascota', 'Piedritas'),
    ('Entretenimiento', 'Salidas'), ('Entretenimiento', 'Eventos'), ('Entretenimiento', 'Juegos'),
    ('Deportes', 'Gimnasio'), ('Deportes', 'Futbol'), ('Deportes', 'Equipamiento'),
    ('Regalos', 'Regalos personales'),
    ('Hogar y equipamiento', 'Bazar'), ('Hogar y equipamiento', 'Cocina'), ('Hogar y equipamiento', 'Decoracion'),
    ('Hogar y equipamiento', 'Electrodomesticos'), ('Hogar y equipamiento', 'Muebles'),
    ('Hogar y equipamiento', 'Ferreteria y reparaciones'), ('Hogar y equipamiento', 'Easy'),
    ('Finanzas y cuotas', 'Cuotas'), ('Finanzas y cuotas', 'Monotributo'), ('Finanzas y cuotas', 'Contadora'),
    ('Impuestos y obligaciones', 'Impuestos varios'),
    ('Otros', 'Varios')
) as datos(categoria, nombre) on datos.categoria = c.nombre
on conflict (categoria_id, nombre) do nothing;

-- Etiquetas
insert into etiquetas (nombre, color) values
  ('IMPREVISTO', '#ef4444'),
  ('VACACIONES', '#0ea5e9'),
  ('REGALO', '#ec4899'),
  ('MEDICO URGENCIA', '#f97316'),
  ('NAVIDAD', '#dc2626'),
  ('MUDANZA', '#8b5cf6'),
  ('MASCOTA URGENCIA', '#84cc16')
on conflict (nombre) do update set color = excluded.color;

-- Configuracion inicial
insert into configuracion (clave, valor) values
  ('colores_personas', '{"franco": "#3b82f6", "fabiola": "#10b981"}'),
  ('lugares_ocultos', '[]')
on conflict (clave) do nothing;
