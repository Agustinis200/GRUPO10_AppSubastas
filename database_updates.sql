-- =====================================================================
-- PUJAYA! - SCRIPT DE ACTUALIZACIONES Y CONSULTAS COMUNES DE BASE DE DATOS
-- =====================================================================
-- Puedes copiar y ejecutar este archivo en el "SQL Editor" de tu consola Supabase.

-- ---------------------------------------------------------------------
-- 0. AGREGAR COLUMNA DE PAÍS EN PERSONAS (REQUERIDO)
-- ---------------------------------------------------------------------
-- Agrega la columna numeropais a la tabla de personas para poder almacenar 
-- el país del cliente antes de que sea aprobado y creado como cliente.
ALTER TABLE public.personas 
ADD COLUMN IF NOT EXISTS numeropais integer;

ALTER TABLE public.personas 
DROP CONSTRAINT IF EXISTS fk_personas_paises;

ALTER TABLE public.personas 
ADD CONSTRAINT fk_personas_paises 
FOREIGN KEY (numeropais) REFERENCES public.paises(numero) ON DELETE SET NULL;



-- ---------------------------------------------------------------------
-- 1. CORRECCIÓN DEL TRIGGER DE STORAGE (ERROR 42501)
-- ---------------------------------------------------------------------
-- Actualiza la función del disparador para evitar que intente realizar 
-- eliminaciones directas de SQL en storage.objects (bloqueadas por Supabase).
CREATE OR REPLACE FUNCTION public.delete_persona_storage_files()
RETURNS TRIGGER AS $$
BEGIN
    -- Retornamos el registro sin realizar DELETE directo sobre storage.objects.
    -- El borrado de los archivos ahora se ejecuta mediante la Storage API de la app.
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ---------------------------------------------------------------------
-- 2. RELACIÓN ENTRE PRODUCTOS Y SEGUROS (JOIN CACHÉ)
-- ---------------------------------------------------------------------
-- Declara la clave foránea entre la columna 'seguro' de 'productos' y 'seguros'.
-- Esto evita la advertencia de caché de esquemas al listar artículos del catálogo.
ALTER TABLE public.productos 
DROP CONSTRAINT IF EXISTS fk_productos_seguros;

ALTER TABLE public.productos 
ADD CONSTRAINT fk_productos_seguros 
FOREIGN KEY (seguro) REFERENCES public.seguros(nroPoliza) ON DELETE SET NULL;


-- ---------------------------------------------------------------------
-- 3. ELIMINAR USUARIO POR ID (BORRADO FÍSICO)
-- ---------------------------------------------------------------------
-- Borrar una persona por su identificador. La clave foránea en la tabla 
-- 'clientes' tiene "ON DELETE CASCADE", por lo que se borrará automáticamente.
-- [Ejemplo de uso: reemplaza el número 10 por el identificador del usuario]
-- DELETE FROM public.personas WHERE identificador = 10;


-- ---------------------------------------------------------------------
-- 4. ELIMINAR USUARIO POR EMAIL
-- ---------------------------------------------------------------------
-- [Ejemplo de uso: reemplaza por el correo a eliminar]
-- DELETE FROM public.personas WHERE email = 'usuario@mail.com';


-- ---------------------------------------------------------------------
-- 5. ADMITIR / APROBAR UN CLIENTE MANUALMENTE Y ASIGNAR CONTRASEÑA
-- ---------------------------------------------------------------------
-- Activa la cuenta de un usuario y fija su contraseña predefinida por su ID.
-- [Reemplaza el ID '10' y la clave 'clave123' por los valores deseados]
UPDATE public.personas 
SET estado = 'activo', passwordhash = 'clave123' 
WHERE identificador = 10;

-- CREAMOS al usuario en la tabla clientes (ya que no se crea al registrarse)
INSERT INTO public.clientes (identificador, numeropais, admitido, categoria, verificador)
VALUES (
    10, 
    (SELECT numeropais FROM public.personas WHERE identificador = 10), 
    'si', 
    'comun', 
    1
)
ON CONFLICT (identificador) DO UPDATE 
SET admitido = 'si';

-- Alternativa: Aprobar, asignar contraseña y crear cliente por EMAIL
-- UPDATE public.personas SET estado = 'activo', passwordhash = 'clave123' WHERE email = 'cliente@mail.com';
-- INSERT INTO public.clientes (identificador, numeropais, admitido, categoria, verificador)
-- VALUES (
--     (SELECT identificador FROM public.personas WHERE email = 'cliente@mail.com'),
--     (SELECT numeropais FROM public.personas WHERE email = 'cliente@mail.com'),
--     'si',
--     'comun',
--     1
-- )
-- ON CONFLICT (identificador) DO UPDATE SET admitido = 'si';


-- ---------------------------------------------------------------------
-- 6. ASIGNAR CONTRASEÑA EN MASA A USUARIOS YA APROBADOS SIN CLAVE
-- ---------------------------------------------------------------------
-- Si tienes usuarios aprobados pero con passwordhash vacío, puedes asignarles
-- una clave por defecto (ej. '123456') con esta consulta:
UPDATE public.personas 
SET passwordhash = '123456' 
WHERE passwordhash IS NULL OR passwordhash = '';


-- ---------------------------------------------------------------------
-- 7. ACTUALIZAR ROL / CATEGORÍA DE UN CLIENTE
-- ---------------------------------------------------------------------
-- La categoría determina a qué subastas puede ofertar (comun, especial, plata, oro, platino).
-- [Reemplaza el ID '10' y la categoria 'oro' por lo que corresponda]
UPDATE public.clientes 
SET categoria = 'oro' -- Valores permitidos: 'comun', 'especial', 'plata', 'oro', 'platino'
WHERE identificador = 10;

-- Alternativa: Cambiar categoría por EMAIL del cliente
-- UPDATE public.clientes SET categoria = 'platino' WHERE identificador = (SELECT identificador FROM public.personas WHERE email = 'cliente@mail.com');


-- ---------------------------------------------------------------------
-- 8. CONVERTIR UN CLIENTE EXISTENTE EN REVISOR TÉCNICO
-- ---------------------------------------------------------------------
-- Si ya existe el usuario en 'personas', puedes darle permisos de revisor técnico:
-- 1. Primero asegúrate de que su estado sea activo
UPDATE public.personas SET estado = 'activo' WHERE email = 'usuario@mail.com';
-- 2. Insértalo en la tabla de empleados (si ya existe, actualizará su cargo)
INSERT INTO public.empleados (identificador, cargo, sector)
VALUES (
    (SELECT identificador FROM public.personas WHERE email = 'usuario@mail.com'),
    'Revisor Técnico',
    NULL
)
ON CONFLICT (identificador) DO UPDATE 
SET cargo = 'Revisor Técnico';


-- ---------------------------------------------------------------------
-- 9. CREAR UN REVISOR TÉCNICO DE PRUEBAS DESDE CERO
-- ---------------------------------------------------------------------
-- Inserta la persona asociada a la cuenta del Revisor Técnico.
INSERT INTO public.personas (documento, nombre, direccion, estado, email, passwordhash)
VALUES ('99999999', 'Revisor Pujas', 'Oficina Central PujaYa!', 'activo', 'revisor@subastas.com', '123456')
ON CONFLICT (email) DO NOTHING;

-- Inserta el registro en la tabla de empleados asociándole el rol de Revisor Técnico.
INSERT INTO public.empleados (identificador, cargo, sector)
SELECT identificador, 'Revisor Técnico', NULL 
FROM public.personas 
WHERE email = 'revisor@subastas.com'
ON CONFLICT (identificador) DO NOTHING;


-- ---------------------------------------------------------------------
-- 10. CONSULTAS ÚTILES DE CONTROL
-- ---------------------------------------------------------------------

-- A. Ver clientes pendientes de admisión
SELECT p.identificador, p.nombre, p.documento, p.email, c.admitido, p.estado
FROM public.personas p
JOIN public.clientes c ON p.identificador = c.identificador
WHERE c.admitido = 'no';

-- B. Ver clientes activos agrupados por su categoría (rol de compra)
SELECT p.identificador, p.nombre, p.email, c.categoria, c.admitido
FROM public.personas p
JOIN public.clientes c ON p.identificador = c.identificador
WHERE p.estado = 'activo';

-- C. Ver todos los empleados (revisores, administradores, etc.)
SELECT p.identificador, p.nombre, p.email, e.cargo
FROM public.personas p
JOIN public.empleados e ON p.identificador = e.identificador;


-- ---------------------------------------------------------------------
-- 11. HABILITAR LECTURA Y ESCRITURA PÚBLICA (ANON) EN RLS PARA LOGIN DIRECTO
-- ---------------------------------------------------------------------
-- Al evitar el uso del autenticador de Supabase, las peticiones de la app 
-- se consideran anónimas (anon). Ejecuta esto para darles permisos en RLS:

-- Personas:
DROP POLICY IF EXISTS "personas_update_owner" ON public.personas;
DROP POLICY IF EXISTS "personas_update_everyone" ON public.personas;
CREATE POLICY "personas_update_everyone" ON public.personas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Clientes:
DROP POLICY IF EXISTS "clientes_select_authenticated" ON public.clientes;
DROP POLICY IF EXISTS "clientes_select_everyone" ON public.clientes;
CREATE POLICY "clientes_select_everyone" ON public.clientes FOR SELECT TO anon, authenticated USING (true);

-- Asistentes:
DROP POLICY IF EXISTS "asistentes_select_authenticated" ON public.asistentes;
DROP POLICY IF EXISTS "asistentes_insert_authenticated" ON public.asistentes;
DROP POLICY IF EXISTS "asistentes_select_everyone" ON public.asistentes;
DROP POLICY IF EXISTS "asistentes_insert_everyone" ON public.asistentes;
CREATE POLICY "asistentes_select_everyone" ON public.asistentes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "asistentes_insert_everyone" ON public.asistentes FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Pujos:
DROP POLICY IF EXISTS "pujos_select_authenticated" ON public.pujos;
DROP POLICY IF EXISTS "pujos_insert_authenticated" ON public.pujos;
DROP POLICY IF EXISTS "pujos_select_everyone" ON public.pujos;
DROP POLICY IF EXISTS "pujos_insert_everyone" ON public.pujos;
CREATE POLICY "pujos_select_everyone" ON public.pujos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pujos_insert_everyone" ON public.pujos FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Subastas, Catálogos, Ítems de Catálogo, Productos y Fotos:
DROP POLICY IF EXISTS "subastas_select_authenticated" ON public.subastas;
DROP POLICY IF EXISTS "subastas_select_everyone" ON public.subastas;
CREATE POLICY "subastas_select_everyone" ON public.subastas FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "catalogos_select_authenticated" ON public.catalogos;
DROP POLICY IF EXISTS "catalogos_select_everyone" ON public.catalogos;
CREATE POLICY "catalogos_select_everyone" ON public.catalogos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "itemscatalogo_select_authenticated" ON public.itemscatalogo;
DROP POLICY IF EXISTS "itemscatalogo_select_everyone" ON public.itemscatalogo;
CREATE POLICY "itemscatalogo_select_everyone" ON public.itemscatalogo FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "productos_select_authenticated" ON public.productos;
DROP POLICY IF EXISTS "productos_insert_authenticated" ON public.productos;
DROP POLICY IF EXISTS "productos_select_everyone" ON public.productos;
DROP POLICY IF EXISTS "productos_insert_everyone" ON public.productos;
CREATE POLICY "productos_select_everyone" ON public.productos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "productos_insert_everyone" ON public.productos FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "fotos_select_authenticated" ON public.fotos;
DROP POLICY IF EXISTS "fotos_insert_authenticated" ON public.fotos;
DROP POLICY IF EXISTS "fotos_select_everyone" ON public.fotos;
DROP POLICY IF EXISTS "fotos_insert_everyone" ON public.fotos;
CREATE POLICY "fotos_select_everyone" ON public.fotos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "fotos_insert_everyone" ON public.fotos FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Medios de Pago, Multas y Notificaciones:
DROP POLICY IF EXISTS "mediosdepago_all_authenticated" ON public.mediosdepago;
DROP POLICY IF EXISTS "mediosdepago_all_everyone" ON public.mediosdepago;
CREATE POLICY "mediosdepago_all_everyone" ON public.mediosdepago FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "multas_all_authenticated" ON public.multas;
DROP POLICY IF EXISTS "multas_all_everyone" ON public.multas;
CREATE POLICY "multas_all_everyone" ON public.multas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "notificaciones_all_authenticated" ON public.notificaciones;
DROP POLICY IF EXISTS "notificaciones_all_everyone" ON public.notificaciones;
CREATE POLICY "notificaciones_all_everyone" ON public.notificaciones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
