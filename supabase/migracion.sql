-- ============================================
-- MIGRACIÓN: Estado, Settlement Cuts y RPCs
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Agregar columna estado a compras (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compras' AND column_name = 'estado'
  ) THEN
    ALTER TABLE compras ADD COLUMN estado text NOT NULL DEFAULT 'confirmada';
  END IF;
END $$;

-- 2. Crear tabla settlement_cuts si no existe
CREATE TABLE IF NOT EXISTS settlement_cuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hogar_id uuid,
  fecha_corte date NOT NULL DEFAULT current_date,
  nota text,
  activo boolean DEFAULT false,
  actualizado_por text NOT NULL DEFAULT '',
  creado_en timestamptz DEFAULT now()
);

-- 3. Función: guardar_compra_borrador
CREATE OR REPLACE FUNCTION guardar_compra_borrador(
  p_compra_id uuid DEFAULT NULL,
  p_fecha date DEFAULT CURRENT_DATE,
  p_nombre_lugar text DEFAULT NULL,
  p_notas text DEFAULT NULL,
  p_registrado_por text DEFAULT '',
  p_hogar_id uuid DEFAULT NULL,
  p_pagador_general text DEFAULT 'compartido',
  p_etiquetas_compra_ids uuid[] DEFAULT '{}',
  p_items jsonb DEFAULT '[]'
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_compra_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_etiqueta_id uuid;
BEGIN
  -- Insertar o actualizar compra
  IF p_compra_id IS NOT NULL THEN
    UPDATE compras
    SET fecha = p_fecha,
        nombre_lugar = p_nombre_lugar,
        notas = p_notas,
        registrado_por = p_registrado_por,
        hogar_id = p_hogar_id,
        pagador_general = p_pagador_general,
        estado = 'borrador'
    WHERE id = p_compra_id;
    v_compra_id := p_compra_id;
  ELSE
    INSERT INTO compras (fecha, nombre_lugar, notas, registrado_por, hogar_id, pagador_general, estado)
    VALUES (p_fecha, p_nombre_lugar, p_notas, p_registrado_por, p_hogar_id, p_pagador_general, 'borrador')
    RETURNING id INTO v_compra_id;
  END IF;

  -- Eliminar items existentes si es actualización
  IF p_compra_id IS NOT NULL THEN
    DELETE FROM items WHERE compra_id = v_compra_id;
  END IF;

  -- Eliminar etiquetas existentes
  DELETE FROM compra_etiquetas WHERE id_compra = v_compra_id;

  -- Insertar etiquetas de compra
  FOREACH v_etiqueta_id IN ARRAY p_etiquetas_compra_ids
  LOOP
    INSERT INTO compra_etiquetas (id_compra, etiqueta_id)
    VALUES (v_compra_id, v_etiqueta_id);
  END LOOP;

  -- Insertar items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO items (
      compra_id,
      categoria_id,
      subcategoria_id,
      descripcion,
      expresion_monto,
      monto_resuelto,
      tipo_reparto,
      pago_franco,
      pago_fabiola
    ) VALUES (
      v_compra_id,
      (v_item->>'categoria_id')::uuid,
      (v_item->>'subcategoria_id')::uuid,
      v_item->>'descripcion',
      v_item->>'expresion_monto',
      (v_item->>'monto_resuelto')::numeric,
      v_item->>'tipo_reparto',
      (v_item->>'pago_franco')::numeric,
      (v_item->>'pago_fabiola')::numeric
    ) RETURNING id INTO v_item_id;

    -- Insertar etiquetas del item
    FOR v_etiqueta_id IN SELECT * FROM jsonb_array_elements_text(v_item->'etiquetas_ids')
    LOOP
      INSERT INTO item_etiquetas (item_id, etiqueta_id)
      VALUES (v_item_id, v_etiqueta_id);
    END LOOP;
  END LOOP;

  RETURN v_compra_id;
END;
$$;

-- 4. Función: crear_compra_completa
CREATE OR REPLACE FUNCTION crear_compra_completa(
  p_fecha date DEFAULT CURRENT_DATE,
  p_nombre_lugar text DEFAULT NULL,
  p_notas text DEFAULT NULL,
  p_registrado_por text DEFAULT '',
  p_hogar_id uuid DEFAULT NULL,
  p_pagador_general text DEFAULT 'compartido',
  p_etiquetas_compra_ids uuid[] DEFAULT '{}',
  p_items jsonb DEFAULT '[]'
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_compra_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_etiqueta_id uuid;
BEGIN
  -- Insertar compra
  INSERT INTO compras (fecha, nombre_lugar, notas, registrado_por, hogar_id, pagador_general, estado)
  VALUES (p_fecha, p_nombre_lugar, p_notas, p_registrado_por, p_hogar_id, p_pagador_general, 'confirmada')
  RETURNING id INTO v_compra_id;

  -- Insertar etiquetas de compra
  FOREACH v_etiqueta_id IN ARRAY p_etiquetas_compra_ids
  LOOP
    INSERT INTO compra_etiquetas (id_compra, etiqueta_id)
    VALUES (v_compra_id, v_etiqueta_id);
  END LOOP;

  -- Insertar items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO items (
      compra_id,
      categoria_id,
      subcategoria_id,
      descripcion,
      expresion_monto,
      monto_resuelto,
      tipo_reparto,
      pago_franco,
      pago_fabiola
    ) VALUES (
      v_compra_id,
      NULLIF(v_item->>'categoria_id', '')::uuid,
      NULLIF(v_item->>'subcategoria_id', '')::uuid,
      NULLIF(v_item->>'descripcion', ''),
      v_item->>'expresion_monto',
      (v_item->>'monto_resuelto')::numeric,
      v_item->>'tipo_reparto',
      (v_item->>'pago_franco')::numeric,
      (v_item->>'pago_fabiola')::numeric
    ) RETURNING id INTO v_item_id;

    -- Insertar etiquetas del item
    FOR v_etiqueta_id IN SELECT * FROM jsonb_array_elements_text(v_item->'etiquetas_ids')
    LOOP
      INSERT INTO item_etiquetas (item_id, etiqueta_id)
      VALUES (v_item_id, v_etiqueta_id);
    END LOOP;
  END LOOP;

  RETURN v_compra_id;
END;
$$;

-- 5. Función: actualizar_compra_completa
CREATE OR REPLACE FUNCTION actualizar_compra_completa(
  p_compra_id uuid,
  p_fecha date DEFAULT CURRENT_DATE,
  p_nombre_lugar text DEFAULT NULL,
  p_notas text DEFAULT NULL,
  p_registrado_por text DEFAULT '',
  p_hogar_id uuid DEFAULT NULL,
  p_pagador_general text DEFAULT 'compartido',
  p_etiquetas_compra_ids uuid[] DEFAULT '{}',
  p_items jsonb DEFAULT '[]'
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_compra_id uuid := p_compra_id;
  v_item jsonb;
  v_item_id uuid;
  v_etiqueta_id uuid;
BEGIN
  -- Actualizar compra
  UPDATE compras
  SET fecha = p_fecha,
      nombre_lugar = p_nombre_lugar,
      notas = p_notas,
      registrado_por = p_registrado_por,
      hogar_id = p_hogar_id,
      pagador_general = p_pagador_general,
      estado = 'confirmada'
  WHERE id = v_compra_id;

  -- Eliminar items y etiquetas existentes
  DELETE FROM items WHERE compra_id = v_compra_id;
  DELETE FROM compra_etiquetas WHERE id_compra = v_compra_id;

  -- Insertar etiquetas de compra
  FOREACH v_etiqueta_id IN ARRAY p_etiquetas_compra_ids
  LOOP
    INSERT INTO compra_etiquetas (id_compra, etiqueta_id)
    VALUES (v_compra_id, v_etiqueta_id);
  END LOOP;

  -- Insertar items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO items (
      compra_id,
      categoria_id,
      subcategoria_id,
      descripcion,
      expresion_monto,
      monto_resuelto,
      tipo_reparto,
      pago_franco,
      pago_fabiola
    ) VALUES (
      v_compra_id,
      NULLIF(v_item->>'categoria_id', '')::uuid,
      NULLIF(v_item->>'subcategoria_id', '')::uuid,
      NULLIF(v_item->>'descripcion', ''),
      v_item->>'expresion_monto',
      (v_item->>'monto_resuelto')::numeric,
      v_item->>'tipo_reparto',
      (v_item->>'pago_franco')::numeric,
      (v_item->>'pago_fabiola')::numeric
    ) RETURNING id INTO v_item_id;

    -- Insertar etiquetas del item
    FOR v_etiqueta_id IN SELECT * FROM jsonb_array_elements_text(v_item->'etiquetas_ids')
    LOOP
      INSERT INTO item_etiquetas (item_id, etiqueta_id)
      VALUES (v_item_id, v_etiqueta_id);
    END LOOP;
  END LOOP;

  RETURN v_compra_id;
END;
$$;
