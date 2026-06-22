-- =====================================================================
-- PUJAYA! - SCRIPT DE ACTUALIZACIONES Y CONSULTAS COMUNES DE BASE DE DATOS
-- =====================================================================
-- Puedes copiar y ejecutar este archivo en el "SQL Editor" de tu consola Supabase.

-- ---------------------------------------------------------------------
-- 0. AGREGAR COLUMNA DE PAÍS EN PERSONAS_CREDENCIALES (REQUERIDO)
-- ---------------------------------------------------------------------
-- Agrega la columna numeropais a la tabla de personas_credenciales para poder almacenar 
-- el país del cliente antes de que sea aprobado y creado como cliente.
ALTER TABLE public.personas_credenciales 
ADD COLUMN IF NOT EXISTS numeropais integer;

ALTER TABLE public.personas_credenciales 
DROP CONSTRAINT IF EXISTS fk_personas_credenciales_paises;

ALTER TABLE public.personas_credenciales 
ADD CONSTRAINT fk_personas_credenciales_paises 
FOREIGN KEY (numeropais) REFERENCES public.paises(numero) ON DELETE SET NULL;


-- ---------------------------------------------------------------------
-- 0.1 ACTUALIZAR TABLA DE MEDIOS DE PAGO Y CREAR CHAT (REQUERIDO PARA CHEQUES Y SOPORTE)
-- ---------------------------------------------------------------------
-- Añadimos la columna monto a la tabla mediosdepago
ALTER TABLE public.mediosdepago 
ADD COLUMN IF NOT EXISTS monto decimal(18,2) default 0.0;

-- Modificamos la restricción del tipo de medio de pago para incluir cheques
ALTER TABLE public.mediosdepago 
DROP CONSTRAINT IF EXISTS chkTipoMedio;

ALTER TABLE public.mediosdepago 
ADD CONSTRAINT chkTipoMedio check (tipo in ('tarjeta', 'cuenta', 'cheque', 'transferencia'));

-- Creamos la tabla de mensajes de chat
CREATE TABLE IF NOT EXISTS public.mensajes_chat (
	identificador integer generated always as identity,
	remitente integer not null,
	destinatario integer not null,
	mensaje text not null,
	fechacreacion timestamp default now(),
	constraint pk_mensajes_chat primary key (identificador),
	constraint fk_mensajes_chat_remitente foreign key (remitente) references public.personas (identificador) ON DELETE CASCADE,
	constraint fk_mensajes_chat_destinatario foreign key (destinatario) references public.personas (identificador) ON DELETE CASCADE
);


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
-- Borrar una persona por su identificador. Las claves foráneas en las tablas 
-- relacionales y auxiliares tienen "ON DELETE CASCADE", por lo que se borrarán automáticamente.
-- [Ejemplo de uso: reemplaza el número 10 por el identificador del usuario]
-- DELETE FROM public.personas WHERE identificador = 10;


-- ---------------------------------------------------------------------
-- 4. ADMITIR / APROBAR UN CLIENTE MANUALMENTE Y ASIGNAR CONTRASEÑA
-- ---------------------------------------------------------------------
-- Activa la cuenta de un usuario y fija su contraseña predefinida por su ID.
-- [Reemplaza el ID '4' y la clave 'clave123' por los valores deseados]
UPDATE public.personas 
SET estado = 'activo'
WHERE identificador = 4;

UPDATE public.personas_credenciales
SET passwordhash = 'clave123'
WHERE identificador = 4;

-- CREAMOS al usuario en la tabla clientes (ya que no se crea al registrarse)
INSERT INTO public.clientes (identificador, numeropais, admitido, categoria, verificador)
VALUES (
    4, 
    (SELECT numeropais FROM public.personas_credenciales WHERE identificador = 4), 
    'si', 
    'comun', 
    1
)
ON CONFLICT (identificador) DO UPDATE 
SET admitido = 'si';


-- ---------------------------------------------------------------------
-- 5. ASIGNAR CONTRASEÑA EN MASA A USUARIOS YA APROBADOS SIN CLAVE
-- ---------------------------------------------------------------------
-- Si tienes usuarios aprobados pero con passwordhash vacío, puedes asignarles
-- una clave por defecto (ej. '123456') con esta consulta:
UPDATE public.personas_credenciales 
SET passwordhash = '123456' 
WHERE passwordhash IS NULL OR passwordhash = '';


-- ---------------------------------------------------------------------
-- 6. ACTUALIZAR ROL / CATEGORÍA DE UN CLIENTE
-- ---------------------------------------------------------------------
-- La categoría determina a qué subastas puede ofertar (comun, especial, plata, oro, platino).
-- [Reemplaza el ID '6' y la categoria 'platino' por lo que corresponda]
UPDATE public.clientes 
SET categoria = 'platino' -- Valores permitidos: 'comun', 'especial', 'plata', 'oro', 'platino'
WHERE identificador = 6;

-- Alternativa: Cambiar categoría por EMAIL del cliente
-- UPDATE public.clientes SET categoria = 'platino' WHERE identificador = (SELECT identificador FROM public.personas_credenciales WHERE email = 'cliente@mail.com');


-- ---------------------------------------------------------------------
-- 7. CONVERTIR UN CLIENTE EXISTENTE EN REVISOR TÉCNICO
-- ---------------------------------------------------------------------
-- Si ya existe el usuario en 'personas', puedes darle permisos de revisor técnico:
-- 1. Primero asegúrate de que su estado sea activo
UPDATE public.personas 
SET estado = 'activo' 
WHERE identificador = (SELECT identificador FROM public.personas_credenciales WHERE email = 'usuario@mail.com');

-- 2. Insértalo en la tabla de empleados (si ya existe, actualizará su cargo)
-- Se usa INSERT ... SELECT para que si no existe el email de ejemplo, la subconsulta no intente insertar una fila con identificador NULL.
INSERT INTO public.empleados (identificador, cargo, sector)
SELECT identificador, 'Revisor Técnico', NULL 
FROM public.personas_credenciales 
WHERE email = 'usuario@mail.com'
ON CONFLICT (identificador) DO UPDATE 
SET cargo = 'Revisor Técnico';


-- ---------------------------------------------------------------------
-- 8. CREAR UN REVISOR TÉCNICO DE PRUEBAS DESDE CERO
-- ---------------------------------------------------------------------
-- Inserta la persona y su credencial asociada a la cuenta del Revisor Técnico.
DO $$
DECLARE
    new_id integer;
BEGIN
    -- Verificamos si ya existe la credencial
    IF NOT EXISTS (SELECT 1 FROM public.personas_credenciales WHERE email = 'revisor@subastas.com') THEN
        -- Insertamos en personas
        INSERT INTO public.personas (documento, nombre, direccion, estado)
        VALUES ('99999999', 'Revisor Pujas', 'Oficina Central PujaYa!', 'activo')
        RETURNING identificador INTO new_id;

        -- Insertamos en personas_credenciales
        INSERT INTO public.personas_credenciales (identificador, email, passwordhash)
        VALUES (new_id, 'revisor@subastas.com', '123456');

        -- Insertamos en empleados
        INSERT INTO public.empleados (identificador, cargo, sector)
        VALUES (new_id, 'Revisor Técnico', NULL);
    END IF;
END $$;


-- ---------------------------------------------------------------------
-- 9. CONSULTAS ÚTILES DE CONTROL
-- ---------------------------------------------------------------------

-- A. Ver clientes pendientes de admisión
SELECT p.identificador, p.nombre, p.documento, pc.email, c.admitido, p.estado
FROM public.personas p
JOIN public.personas_credenciales pc ON p.identificador = pc.identificador
JOIN public.clientes c ON p.identificador = c.identificador
WHERE c.admitido = 'no';

-- B. Ver clientes activos agrupados por su categoría (rol de compra)
SELECT p.identificador, p.nombre, pc.email, c.categoria, c.admitido
FROM public.personas p
JOIN public.personas_credenciales pc ON p.identificador = pc.identificador
JOIN public.clientes c ON p.identificador = c.identificador
WHERE p.estado = 'activo';

-- C. Ver todos los empleados (revisores, administradores, etc.)
SELECT p.identificador, p.nombre, pc.email, e.cargo
FROM public.personas p
JOIN public.personas_credenciales pc ON p.identificador = pc.identificador
JOIN public.empleados e ON p.identificador = e.identificador;


-- ---------------------------------------------------------------------
-- 10. HABILITAR LECTURA Y ESCRITURA PÚBLICA (ANON) EN RLS PARA LOGIN DIRECTO
-- ---------------------------------------------------------------------
-- Al evitar el uso del autenticador de Supabase, las peticiones de la app 
-- se consideran anónimas (anon). Ejecuta esto para darles permisos en RLS:

-- Personas:
DROP POLICY IF EXISTS "personas_update_owner" ON public.personas;
DROP POLICY IF EXISTS "personas_update_everyone" ON public.personas;
CREATE POLICY "personas_update_everyone" ON public.personas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Personas Credenciales:
ALTER TABLE public.personas_credenciales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "personas_credenciales_all_everyone" ON public.personas_credenciales;
CREATE POLICY "personas_credenciales_all_everyone" ON public.personas_credenciales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

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

-- Pujos Detalles:
ALTER TABLE public.pujos_detalles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pujos_detalles_all_everyone" ON public.pujos_detalles;
CREATE POLICY "pujos_detalles_all_everyone" ON public.pujos_detalles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

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

-- Productos Detalles:
ALTER TABLE public.productos_detalles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "productos_detalles_all_everyone" ON public.productos_detalles;
CREATE POLICY "productos_detalles_all_everyone" ON public.productos_detalles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

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

-- Mensajes de Chat:
ALTER TABLE public.mensajes_chat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mensajes_chat_all_everyone" ON public.mensajes_chat;
CREATE POLICY "mensajes_chat_all_everyone" ON public.mensajes_chat FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Empleados, Dueños y Subastadores:
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "empleados_all_everyone" ON public.empleados;
CREATE POLICY "empleados_all_everyone" ON public.empleados FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.duenios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "duenios_all_everyone" ON public.duenios;
CREATE POLICY "duenios_all_everyone" ON public.duenios FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.subastadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subastadores_all_everyone" ON public.subastadores;
CREATE POLICY "subastadores_all_everyone" ON public.subastadores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 11. ACTUALIZAR TABLAS AUXILIARES PARA MULTI-MONEDA Y NEGOCIACIÓN (REQUERIDO)
-- ---------------------------------------------------------------------

-- Moneda en medios de pago
ALTER TABLE public.mediosdepago 
ADD COLUMN IF NOT EXISTS moneda varchar(10) default 'ARS';

ALTER TABLE public.mediosdepago 
DROP CONSTRAINT IF EXISTS chkMonedaMedio;

ALTER TABLE public.mediosdepago 
ADD CONSTRAINT chkMonedaMedio check (moneda in ('ARS', 'USD'));

-- Negociación de productos en la tabla auxiliar productos_detalles
ALTER TABLE public.productos_detalles 
ADD COLUMN IF NOT EXISTS moneda varchar(10) default 'ARS',
ADD COLUMN IF NOT EXISTS precio_base_propuesto decimal(18,2) null,
ADD COLUMN IF NOT EXISTS comision_propuesta decimal(18,2) null,
ADD COLUMN IF NOT EXISTS propuesta_estado varchar(25) default 'en_revision',
ADD COLUMN IF NOT EXISTS motivo_rechazo text null;

ALTER TABLE public.productos_detalles 
DROP CONSTRAINT IF EXISTS chkMonedaProd;

ALTER TABLE public.productos_detalles 
ADD CONSTRAINT chkMonedaProd check (moneda in ('ARS', 'USD'));

ALTER TABLE public.productos_detalles 
DROP CONSTRAINT IF EXISTS chkPropuesta;

ALTER TABLE public.productos_detalles 
ADD CONSTRAINT chkPropuesta check (propuesta_estado in ('en_revision', 'propuesta_enviada', 'aceptada', 'rechazada'));


-- Incorporar estado de lectura a los mensajes de chat
ALTER TABLE public.mensajes_chat 
ADD COLUMN IF NOT EXISTS leido varchar(2) default 'no';

ALTER TABLE public.mensajes_chat 
DROP CONSTRAINT IF EXISTS chkLeidoChat;

ALTER TABLE public.mensajes_chat 
ADD CONSTRAINT chkLeidoChat check (leido in ('si', 'no'));


-- RLS Policies for subastas, catalogos, and itemscatalogo to allow inserts
ALTER TABLE public.subastas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subastas_all_everyone" ON public.subastas;
CREATE POLICY "subastas_all_everyone" ON public.subastas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.catalogos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "catalogos_all_everyone" ON public.catalogos;
CREATE POLICY "catalogos_all_everyone" ON public.catalogos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.itemscatalogo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "itemscatalogo_all_everyone" ON public.itemscatalogo;
CREATE POLICY "itemscatalogo_all_everyone" ON public.itemscatalogo FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ---------------------------------------------------------------------
-- RESTRICCIÓN: UN PRODUCTO SOLO PUEDE ESTAR EN UNA SUBASTA A LA VEZ
-- ---------------------------------------------------------------------
-- PASO 1: Eliminar duplicados existentes conservando solo el registro más
-- reciente (mayor identificador) para cada producto.
-- Esto limpia los datos antes de agregar la restricción de unicidad.
DELETE FROM public.itemscatalogo
WHERE identificador NOT IN (
  SELECT MAX(identificador)
  FROM public.itemscatalogo
  GROUP BY producto
);

-- PASO 2: Eliminar constraint anterior si existe y agregar la nueva.
ALTER TABLE public.itemscatalogo
DROP CONSTRAINT IF EXISTS uq_itemscatalogo_producto;

ALTER TABLE public.itemscatalogo
ADD CONSTRAINT uq_itemscatalogo_producto UNIQUE (producto);


-- RLS Policy for seguros table (needed for admin to insert policy data)
ALTER TABLE public.seguros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "seguros_all_everyone" ON public.seguros;
CREATE POLICY "seguros_all_everyone" ON public.seguros FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ---------------------------------------------------------------------
-- ÍNDICES DE RENDIMIENTO (PERFORMANCE INDEXES)
-- ---------------------------------------------------------------------
-- Accelera las consultas más frecuentes de la app evitando table scans.

-- Notificaciones por cliente (se consulta en cada login y tab change)
CREATE INDEX IF NOT EXISTS idx_notificaciones_cliente 
  ON public.notificaciones (cliente);

-- Multas por cliente
CREATE INDEX IF NOT EXISTS idx_multas_cliente 
  ON public.multas (cliente);

-- Medios de pago por cliente  
CREATE INDEX IF NOT EXISTS idx_mediosdepago_cliente 
  ON public.mediosdepago (cliente);

-- Estado de propuesta de productos (filtro principal del panel admin)
CREATE INDEX IF NOT EXISTS idx_productos_detalles_propuesta 
  ON public.productos_detalles (propuesta_estado);

-- Estado de subastas (filtro principal en pantalla de subastas y home)
CREATE INDEX IF NOT EXISTS idx_subastas_estado 
  ON public.subastas (estado);

-- Productos por dueño (pantalla Mis Artículos)
CREATE INDEX IF NOT EXISTS idx_productos_duenio 
  ON public.productos (duenio);

-- Items de catálogo por producto (validación de duplicados y carga de subastas)
CREATE INDEX IF NOT EXISTS idx_itemscatalogo_producto 
  ON public.itemscatalogo (producto);

-- Fotos por producto (carga de imágenes en subastas)
CREATE INDEX IF NOT EXISTS idx_fotos_producto 
  ON public.fotos (producto);


-- ---------------------------------------------------------------------
-- ACTUALIZACIÓN DE SUBASTAS Y DETALLES DE PRODUCTOS
-- ---------------------------------------------------------------------
-- Eliminar la restricción que exige programar con más de 10 días de anticipación al editar/abrir
ALTER TABLE public.subastas 
DROP CONSTRAINT IF EXISTS chkfecha;

-- Agregar columnas de información histórica para los productos
ALTER TABLE public.productos_detalles 
ADD COLUMN IF NOT EXISTS artista_diseniador varchar(250);

ALTER TABLE public.productos_detalles 
ADD COLUMN IF NOT EXISTS anio_periodo varchar(100);

ALTER TABLE public.productos_detalles 
ADD COLUMN IF NOT EXISTS contexto_historico text;


-- ---------------------------------------------------------------------
-- POLÍTICA DE SEGURIDAD (RLS) PARA REGISTRO DE SUBASTA
-- ---------------------------------------------------------------------
-- Habilitar RLS en registrodesubasta y permitir operaciones a perfiles anon/authenticated para pruebas/demo local.
ALTER TABLE public.registrodesubasta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registrodesubasta_all_everyone" ON public.registrodesubasta;
CREATE POLICY "registrodesubasta_all_everyone" ON public.registrodesubasta FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ---------------------------------------------------------------------
-- ACTUALIZACIÓN DE ESTADOS DE PROPUESTA (INSPECCIÓN EN VARIOS PASOS)
-- ---------------------------------------------------------------------
-- 1. Eliminar la restricción original chkPropuesta si existe
ALTER TABLE public.productos_detalles 
DROP CONSTRAINT IF EXISTS chkPropuesta;

-- 2. Agregar la nueva restricción que permite los nuevos estados intermedios del flujo
ALTER TABLE public.productos_detalles 
ADD CONSTRAINT chkPropuesta CHECK (propuesta_estado IN ('en_revision', 'esperando_inspeccion', 'inspeccion_rechazada', 'en_inspeccion', 'propuesta_enviada', 'aceptada', 'rechazada', 'inspeccion_fallida'));

-- 3. Agregar columna para almacenar la dirección física de inspección establecida por el revisor
ALTER TABLE public.productos_detalles 
ADD COLUMN IF NOT EXISTS direccion_inspeccion text;


-- ---------------------------------------------------------------------
-- POLÍTICA DE SEGURIDAD (RLS) PARA LA TABLA PRODUCTOS
-- ---------------------------------------------------------------------
-- Actualmente, la tabla productos solo permite SELECT e INSERT.
-- Agregamos la política FOR ALL para permitir UPDATE (necesario para asociar seguros y disponibilidad).
DROP POLICY IF EXISTS "productos_select_everyone" ON public.productos;
DROP POLICY IF EXISTS "productos_insert_everyone" ON public.productos;
DROP POLICY IF EXISTS "productos_all_everyone" ON public.productos;
CREATE POLICY "productos_all_everyone" ON public.productos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ---------------------------------------------------------------------
-- POLÍTICA DE SEGURIDAD (RLS) PARA LA TABLA CLIENTES
-- ---------------------------------------------------------------------
-- Permitir a usuarios anon y authenticated realizar operaciones completas sobre la tabla clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clientes_select_everyone" ON public.clientes;
DROP POLICY IF EXISTS "clientes_all_everyone" ON public.clientes;
CREATE POLICY "clientes_all_everyone" ON public.clientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ---------------------------------------------------------------------
-- AGREGAR COLUMNA DE MEDIO DE PAGO PREDETERMINADO
-- ---------------------------------------------------------------------
ALTER TABLE public.mediosdepago 
ADD COLUMN IF NOT EXISTS predeterminado boolean default false;


-- ---------------------------------------------------------------------
-- 23. AGREGAR POLÍTICA DE ACTUALIZACIÓN EN PUJOS PARA ADJUDICACIÓN DE GANADORES
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "pujos_all_everyone" ON public.pujos;
CREATE POLICY "pujos_all_everyone" ON public.pujos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Corregir ofertas ganadoras existentes que no se pudieron actualizar debido a RLS
UPDATE public.pujos
SET ganador = 'si'
WHERE identificador IN (
  SELECT p.identificador
  FROM (
    SELECT identificador,
           ROW_NUMBER() OVER (PARTITION BY item ORDER BY importe DESC) as rn
    FROM public.pujos
    WHERE item IN (SELECT identificador FROM public.itemscatalogo WHERE subastado = 'si')
  ) p
  WHERE p.rn = 1
);

