-- =====================================================================
-- SUPABASE SECURITY SCHEME & RLS POLICIES FOR OSWT ORCHESTRA INVENTORY
-- =====================================================================

-- 1. Habilitar RLS en las tablas principales
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 2. Limpieza de políticas permisivas preexistentes para evitar brechas de seguridad
DROP POLICY IF EXISTS "Enable all access for anon" ON public.inventory;
DROP POLICY IF EXISTS "inventory_write" ON public.inventory;

DROP POLICY IF EXISTS "Enable all access for anon" ON public.history;
DROP POLICY IF EXISTS "history_write" ON public.history;

DROP POLICY IF EXISTS "Enable all access for anon" ON public.students;
DROP POLICY IF EXISTS "students_write" ON public.students;

-- 3. Crear Políticas de Seguridad RLS Estrictas

-- ==================== TABLA: inventory ====================
-- Permitir lectura pública (estudiantes escaneando QR y administradores viendo la lista)
CREATE POLICY "inventory_select_public" 
ON public.inventory 
FOR SELECT 
USING (true);

-- Restringir escritura, edición y borrado exclusivamente a usuarios autenticados
CREATE POLICY "inventory_write_authenticated" 
ON public.inventory 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- ==================== TABLA: history ====================
-- Permitir lectura pública de registros históricos
CREATE POLICY "history_select_public" 
ON public.history 
FOR SELECT 
USING (true);

-- Restringir inserción y edición de historial a administradores autenticados
CREATE POLICY "history_write_authenticated" 
ON public.history 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- ==================== TABLA: students ====================
-- Permitir lectura pública del directorio de estudiantes
CREATE POLICY "students_select_public" 
ON public.students 
FOR SELECT 
USING (true);

-- Restringir administración de estudiantes a administradores autenticados
CREATE POLICY "students_write_authenticated" 
ON public.students 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);


-- 4. Definir Funciones RPC Seguras (SECURITY DEFINER)
-- Estas funciones se ejecutan con privilegios de superusuario ("postgres"), 
-- permitiendo a estudiantes anónimos actualizar datos exclusivamente a través del flujo QR/Formulario.

-- ==================== FUNCIÓN: rpc_checkout_instrument ====================
CREATE OR REPLACE FUNCTION public.rpc_checkout_instrument(
  p_instrument_id text,
  p_student_name text,
  p_curso text,
  p_fecha text,
  p_time_str text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instrument_exists boolean;
  v_selected_instrument record;
  v_history_id text;
  v_now timestamp with time zone := now();
  v_year integer;
  v_month integer;
BEGIN
  -- Normalizar inputs
  p_student_name := TRIM(p_student_name);
  p_curso := TRIM(p_curso);

  -- Validar campos obligatorios
  IF p_student_name = '' OR p_curso = '' THEN
    RAISE EXCEPTION 'El nombre del estudiante y el curso son campos obligatorios.';
  END IF;

  -- Intentar parsear el año y mes desde la fecha provista (formato YYYY-MM-DD esperado)
  BEGIN
    v_year := split_part(p_fecha, '-', 1)::integer;
    v_month := split_part(p_fecha, '-', 2)::integer - 1; -- 0-indexed para compatibilidad con JS
  EXCEPTION WHEN OTHERS THEN
    v_year := extract(year from v_now)::integer;
    v_month := extract(month from v_now)::integer - 1;
  END;

  -- Comprobar la existencia del instrumento en inventario
  SELECT * INTO v_selected_instrument FROM public.inventory WHERE id = p_instrument_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Instrumento con ID % no encontrado en el inventario.', p_instrument_id;
  END IF;

  -- 1. Actualizar el estado del instrumento en la tabla inventory
  UPDATE public.inventory
  SET 
    "Estudiante" = p_student_name,
    "Curso" = p_curso,
    "Prestado" = 'SÍ',
    "Ubicacion" = 'HOGAR',
    "FechaSalida" = p_fecha,
    "HoraSalida" = p_time_str,
    "FechaRetorno" = ''
  WHERE id = p_instrument_id;

  -- Generar un ID de 9 caracteres aleatorios para el registro histórico
  v_history_id := substring(md5(random()::text) from 1 for 9);

  -- 2. Insertar el registro de movimiento en la tabla history
  INSERT INTO public.history (
    id,
    "instrumentId",
    "instrumentName",
    "serie",
    "marca",
    "estudiante",
    "curso",
    "fechaSalida",
    "horaSalida",
    "status",
    "mes",
    "anio",
    "fechaRetorno"
  ) VALUES (
    v_history_id,
    p_instrument_id,
    COALESCE(v_selected_instrument."Instrumento", 'INSTRUMENTO SIN NOMBRE'),
    COALESCE(v_selected_instrument."Serie", ''),
    COALESCE(v_selected_instrument."Marca", ''),
    p_student_name,
    p_curso,
    p_fecha,
    p_time_str,
    'en_prestamo',
    v_month,
    v_year,
    ''
  );

  -- 3. Upsert del estudiante en la tabla students
  INSERT INTO public.students (name, course, instrument, last_update)
  VALUES (
    UPPER(p_student_name), 
    UPPER(p_curso), 
    COALESCE(v_selected_instrument."Instrumento", ''),
    v_now
  )
  ON CONFLICT (name) DO UPDATE 
  SET 
    course = EXCLUDED.course,
    instrument = EXCLUDED.instrument,
    last_update = EXCLUDED.last_update;

  RETURN jsonb_build_object(
    'success', true,
    'history_id', v_history_id,
    'message', 'Préstamo procesado exitosamente.'
  );
END;
$$;

-- ==================== FUNCIÓN: rpc_return_instrument ====================
CREATE OR REPLACE FUNCTION public.rpc_return_instrument(
  p_instrument_id text,
  p_fecha text,
  p_history_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resolved_history_id text;
BEGIN
  -- 1. Actualizar el estado del instrumento en inventory a disponible
  UPDATE public.inventory
  SET 
    "Prestado" = 'NO',
    "Ubicacion" = 'SALA DE MÚSICA',
    "FechaRetorno" = p_fecha,
    "Estudiante" = '',
    "Curso" = ''
  WHERE id = p_instrument_id;

  -- 2. Resolver el registro histórico de préstamo activo si no se especificó un ID
  IF p_history_id IS NULL OR p_history_id = '' THEN
    SELECT id INTO v_resolved_history_id 
    FROM public.history 
    WHERE "instrumentId" = p_instrument_id AND "status" = 'en_prestamo'
    ORDER BY created_at DESC 
    LIMIT 1;
  ELSE
    v_resolved_history_id := p_history_id;
  END IF;

  -- 3. Actualizar el registro histórico a completado
  IF v_resolved_history_id IS NOT NULL THEN
    UPDATE public.history
    SET 
      "fechaRetorno" = p_fecha,
      "status" = 'completado'
    WHERE id = v_resolved_history_id;
  ELSE
    -- Buscar un fallback general si la tabla history se desincronizó
    UPDATE public.history
    SET 
      "fechaRetorno" = p_fecha,
      "status" = 'completado'
    WHERE "instrumentId" = p_instrument_id AND "status" = 'en_prestamo';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'history_id', COALESCE(v_resolved_history_id, 'none'),
    'message', 'Retorno de instrumento procesado exitosamente.'
  );
END;
$$;
