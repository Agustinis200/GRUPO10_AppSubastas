-- =====================================================================
-- SCRIPT COMPLETO DE BASE DE DATOS Y RLS - SUPABASE
-- =====================================================================
-- Este archivo contiene las tablas utilizadas actualmente en Supabase,
-- los inserts de datos de prueba y la configuración de RLS.
-- =====================================================================

-- Opcional: Si deseas limpiar y recrear todas las tablas con las nuevas relaciones CASCADE,
-- puedes descomentar y ejecutar este bloque en tu editor SQL de Supabase antes del resto del script:
/*
DROP TABLE IF EXISTS public.registroDeSubasta CASCADE;
DROP TABLE IF EXISTS public.pujos CASCADE;
DROP TABLE IF EXISTS public.asistentes CASCADE;
DROP TABLE IF EXISTS public.itemsCatalogo CASCADE;
DROP TABLE IF EXISTS public.catalogos CASCADE;
DROP TABLE IF EXISTS public.fotos CASCADE;
DROP TABLE IF EXISTS public.productos CASCADE;
DROP TABLE IF EXISTS public.subastas CASCADE;
DROP TABLE IF EXISTS public.subastadores CASCADE;
DROP TABLE IF EXISTS public.duenios CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.seguros CASCADE;
DROP TABLE IF EXISTS public.sectores CASCADE;
DROP TABLE IF EXISTS public.empleados CASCADE;
DROP TABLE IF EXISTS public.personas CASCADE;
DROP TABLE IF EXISTS public.paises CASCADE;
*/

-- ---------------------------------------------------------------------
-- 1. CREACIÓN DE TABLAS (POSTGRESQL SYNTAX)
-- ---------------------------------------------------------------------

create table if not exists public.paises(
	numero integer not null,
	nombre varchar(250) not null,
	nombreCorto varchar(250) null,
	capital varchar(250) not null,
	nacionalidad varchar(250) not null,
	idiomas varchar(150) not null,
	constraint pk_paises primary key (numero)
);

create table if not exists public.personas(
	identificador integer generated always as identity,
	documento varchar(20) not null,
	nombre varchar(150) not null,
	direccion varchar(250),
	estado varchar(15) constraint chkEstado check (estado in ('activo', 'inactivo')),
	foto bytea, -- Cambiado a bytea para guardar la selfie de perfil (varbinary max)
    fotos_documento varchar(1000), -- Agregado para almacenar URLs de las fotos de los documentos
    email varchar(250) unique, -- Agregado para Login
    passwordHash varchar(250), -- Agregado para Login
    numeropais integer, -- Agregado para almacenar temporalmente el país de origen hasta ser aprobado
	constraint pk_personas primary key (identificador),
	constraint fk_personas_paises foreign key (numeropais) references public.paises (numero) ON DELETE SET NULL
);

create table if not exists public.empleados(
	identificador integer not null,
	cargo varchar(100),
	sector integer null,
	constraint pk_empleados primary key (identificador),
	constraint fk_empleados_personas foreign key (identificador) references public.personas (identificador) ON DELETE CASCADE
);

create table if not exists public.sectores(
	identificador integer generated always as identity,
	nombreSector varchar(150) not null,
	codigoSector varchar(10) null,
	responsableSector integer null,
	constraint pk_sectores primary key (identificador),
	constraint fk_sectores_empleados foreign key (responsableSector) references public.empleados (identificador) ON DELETE SET NULL
);

create table if not exists public.seguros(
	nroPoliza varchar(30) not null,
	compania varchar(150) not null,
	polizaCombinada varchar(2) constraint chkpolizaCombinada check(polizaCombinada in ('si','no')),
	importe decimal(18,2) not null constraint chkImporte check (importe > 0),
	constraint pk_seguro primary key (nroPoliza)
);
	
create table if not exists public.clientes(
	identificador integer not null,
	numeroPais integer,
	admitido varchar(2) constraint chkAdmitido check(admitido in ('si','no')),
	categoria varchar(10) constraint chkCategoria check (categoria in ('comun', 'especial', 'plata', 'oro', 'platino')),
	verificador integer not null,
	constraint pk_clientes primary key (identificador),
	constraint fk_clientes_personas foreign key (identificador) references public.personas (identificador) ON DELETE CASCADE,
	constraint fk_clientes_empleados foreign key (verificador) references public.empleados (identificador) ON DELETE CASCADE,
	constraint fk_clientes_paises foreign key (numeroPais) references public.paises (numero) ON DELETE SET NULL
);

create table if not exists public.duenios(
	identificador integer not null,
	numeroPais integer,
	verificaciónFinanciera varchar(2) constraint chkVF check(verificaciónFinanciera in ('si','no')),
	verificaciónJudicial varchar(2) constraint chkVJ check(verificaciónJudicial in ('si','no')),
	calificacionRiesgo integer constraint chkCR check(calificacionRiesgo in (1,2,3,4,5,6)),
	verificador integer not null,
	constraint pk_duenios primary key (identificador),
	constraint fk_duenios_personas foreign key (identificador) references public.personas (identificador) ON DELETE CASCADE,
	constraint fk_duenios_empleados foreign key (verificador) references public.empleados (identificador) ON DELETE CASCADE
);

create table if not exists public.subastadores(
	identificador integer not null,
	matricula varchar(15),
	region varchar(50),
	constraint pk_subastadores primary key (identificador),
	constraint fk_subastadores_personas foreign key (identificador) references public.personas (identificador) ON DELETE CASCADE
);

create table if not exists public.subastas(
	identificador integer generated always as identity,
	-- las subastas tiene al menos 10 dias de anticipación al momento de crearlas (Postgres syntax)
	fecha date constraint chkFecha check (fecha > (current_date + interval '10 days')),
	hora time not null,
	estado varchar(10) constraint chkES check (estado in ('abierta','cerrada')),
	subastador integer null,
	ubicacion varchar(350) null,
	capacidadAsistentes integer null,
	tieneDeposito varchar(2) constraint chkTD check(tieneDeposito in ('si','no')),
	seguridadPropia varchar(2) constraint chkSP check(seguridadPropia in ('si','no')),
	categoria varchar(10) constraint chkCS check (categoria in ('comun', 'especial', 'plata', 'oro', 'platino')),
	constraint pk_subastas primary key (identificador),
	constraint fk_subastas_subastadores foreign key (subastador) references public.subastadores(identificador) ON DELETE SET NULL
);

create table if not exists public.productos(
	identificador integer generated always as identity,
	fecha date,
	disponible varchar(2) constraint chkD check (disponible in ('si','no')),
	descripcionCatalogo varchar(500) null default 'No Posee',
	descripcionCompleta varchar(300) not null,
	revisor integer not null,
	duenio integer not null,
	seguro varchar(30) null,
	informacion_historica text,
	documento_origen text,
	constraint pk_productos primary key (identificador),
	constraint fk_productos_empleados foreign key (revisor) references public.empleados(identificador) ON DELETE CASCADE,
	constraint fk_productos_duenios foreign key (duenio) references public.duenios(identificador) ON DELETE CASCADE,
	constraint fk_productos_seguros foreign key (seguro) references public.seguros(nroPoliza) ON DELETE SET NULL
);

create table if not exists public.fotos(
	identificador integer generated always as identity,
	producto integer not null,
	foto bytea not null, -- Cambiado a bytea para guardar la imagen como binario (varbinary max)
	constraint pk_fotos primary key (identificador),
	constraint fk_fotos_productos foreign key (producto) references public.productos(identificador) ON DELETE CASCADE
);

create table if not exists public.catalogos(
	identificador integer generated always as identity,
	descripcion varchar(250) not null,
	subasta integer null,
	responsable integer not null,
	constraint pk_catalogos primary key (identificador),
	constraint fk_catalogos_empleados foreign key (responsable) references public.empleados(identificador) ON DELETE CASCADE,
	constraint fk_catalogos_subastas foreign key (subasta) references public.subastas(identificador) ON DELETE CASCADE
);

create table if not exists public.itemsCatalogo(
	identificador integer generated always as identity,
	catalogo integer not null,
	producto integer not null,
	precioBase decimal(18,2) not null constraint chkPB check (precioBase > 0.01),
	comision decimal(18,2) not null constraint chkC check (comision > 0.01),
	subastado varchar(2) constraint chkS check (subastado in ('si','no')),
	constraint pk_itemsCatalogo primary key (identificador),
	constraint fk_itemsCatalogo_catalogos foreign key (catalogo) references public.catalogos ON DELETE CASCADE,
	constraint fk_itemsCatalogo_productos foreign key (producto) references public.productos ON DELETE CASCADE
);

create table if not exists public.asistentes(
	identificador integer generated always as identity,
	numeroPostor integer not null,
	cliente integer not null,
	subasta integer not null,
	constraint pk_asistentes primary key (identificador),
	constraint fk_asistentes_clientes foreign key (cliente) references public.clientes ON DELETE CASCADE,
	constraint fk_asistentes_subasta foreign key (subasta) references public.subastas ON DELETE CASCADE
);

create table if not exists public.pujos(
	identificador integer generated always as identity,
	asistente integer not null,
	item integer not null,
	importe decimal(18,2) not null constraint chkI check (importe > 0.01),
	ganador varchar(2) constraint chkG check (ganador in ('si','no')) default 'no',
    fechaHora timestamp default now(), -- Agregado para saber cuando se hizo la puja
	constraint pk_pujos primary key (identificador),
	constraint fk_pujos_asistentes foreign key (asistente) references public.asistentes ON DELETE CASCADE,
	constraint fk_pujos_itemsCatalogo foreign key (item) references public.itemsCatalogo ON DELETE CASCADE
);

create table if not exists public.registroDeSubasta(
	identificador integer generated always as identity,
	subasta integer not null,
	duenio integer not null,
	producto integer not null,
	cliente integer not null,
	importe decimal(18,2) not null constraint chkImportePagado check (importe > 0.01),
	comision decimal(18,2) not null constraint chkComisionPagada check (comision > 0.01),
	constraint pk_registroDeSubasta primary key (identificador),
	constraint fk_registroDeSubasta_subastas foreign key (subasta) references public.subastas ON DELETE CASCADE,
	constraint fk_registroDeSubasta_duenios foreign key (duenio) references public.duenios ON DELETE CASCADE,
	constraint fk_registroDeSubasta_producto foreign key (producto) references public.productos ON DELETE CASCADE,
	constraint fk_registroDeSubasta_cliente foreign key (cliente) references public.clientes ON DELETE CASCADE
);

create table if not exists public.mediosdepago(
	identificador integer generated always as identity,
	cliente integer not null,
	tipo varchar(30) constraint chkTipoMedio check (tipo in ('tarjeta', 'transferencia')),
	proveedor varchar(100) not null,
	mascara varchar(50) not null,
	estado varchar(15) default 'activo',
	constraint pk_mediosdepago primary key (identificador),
	constraint fk_mediosdepago_clientes foreign key (cliente) references public.clientes (identificador) ON DELETE CASCADE
);

create table if not exists public.multas(
	identificador integer generated always as identity,
	cliente integer not null,
	descripcion varchar(250) not null,
	monto decimal(18,2) not null constraint chkMontoMulta check (monto > 0.01),
	estado varchar(15) constraint chkEstadoMulta check (estado in ('pendiente', 'pagada')) default 'pendiente',
	fechacreacion timestamp default now(),
	constraint pk_multas primary key (identificador),
	constraint fk_multas_clientes foreign key (cliente) references public.clientes (identificador) ON DELETE CASCADE
);

create table if not exists public.notificaciones(
	identificador integer generated always as identity,
	cliente integer not null,
	titulo varchar(200) not null,
	mensaje text not null,
	leido varchar(2) constraint chkLeido check (leido in ('si', 'no')) default 'no',
	fechacreacion timestamp default now(),
	constraint pk_notificaciones primary key (identificador),
	constraint fk_notificaciones_personas foreign key (cliente) references public.personas (identificador) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 2. INSERT DE DATOS MOCK / PRUEBA
-- ---------------------------------------------------------------------

-- Paises
INSERT INTO public.paises (numero, nombre, nombreCorto, capital, nacionalidad, idiomas) VALUES
(32, 'Argentina', 'ARG', 'Buenos Aires', 'Argentina', 'Español'),
(76, 'Brasil', 'BRA', 'Brasilia', 'Brasileña', 'Portugués'),
(152, 'Chile', 'CHL', 'Santiago', 'Chilena', 'Español'),
(170, 'Colombia', 'COL', 'Bogotá', 'Colombiana', 'Español'),
(858, 'Uruguay', 'URY', 'Montevideo', 'Uruguaya', 'Español'),
(604, 'Perú', 'PER', 'Lima', 'Peruana', 'Español'),
(840, 'Estados Unidos', 'USA', 'Washington D.C.', 'Estadounidense', 'Inglés')
ON CONFLICT (numero) DO NOTHING;

-- Subastas
INSERT INTO public.subastas (fecha, hora, estado, ubicacion, capacidadAsistentes, tieneDeposito, seguridadPropia, categoria) 
VALUES 
(current_date + 12, '14:30:00', 'abierta', 'Hotel Hilton, Salón B', 150, 'no', 'si', 'oro'),
(current_date + 15, '10:00:00', 'abierta', 'Subasta 100% Virtual', 500, 'no', 'no', 'comun'),
(current_date + 20, '18:00:00', 'abierta', 'Depósito Central', 50, 'si', 'si', 'platino')
ON CONFLICT DO NOTHING;

-- Personas (Revisor, Vendedor, Postor)
INSERT INTO public.personas (documento, nombre, direccion, estado, email)
VALUES 
('11111111', 'Empleado Revisor', 'Calle Falsa 123', 'activo', 'revisor@subastas.com'),
('22222222', 'Dueño Vendedor', 'Av. Santa Fe 456', 'activo', 'vendedor@subastas.com'),
('33333333', 'Usuario Postor', 'Av. Corrientes 789', 'activo', 'juan@mail.com')
ON CONFLICT (email) DO NOTHING;

-- Empleados
INSERT INTO public.empleados (identificador, cargo, sector)
SELECT identificador, 'Revisor Técnico', NULL FROM public.personas WHERE email = 'revisor@subastas.com'
ON CONFLICT (identificador) DO NOTHING;

-- Dueños
INSERT INTO public.duenios (identificador, numeroPais, verificaciónFinanciera, verificaciónJudicial, calificacionRiesgo, verificador)
SELECT p.identificador, NULL, 'si', 'si', 1, e.identificador
FROM public.personas p, public.empleados e
WHERE p.email = 'vendedor@subastas.com' AND e.identificador = (SELECT identificador FROM public.personas WHERE email = 'revisor@subastas.com')
ON CONFLICT (identificador) DO NOTHING;

-- Clientes
INSERT INTO public.clientes (identificador, numeroPais, admitido, categoria, verificador)
SELECT p.identificador, NULL, 'si', 'comun', e.identificador
FROM public.personas p, public.empleados e
WHERE p.email = 'juan@mail.com' AND e.identificador = (SELECT identificador FROM public.personas WHERE email = 'revisor@subastas.com')
ON CONFLICT (identificador) DO NOTHING;

-- Productos
INSERT INTO public.productos (fecha, disponible, descripcionCatalogo, descripcionCompleta, revisor, duenio, seguro)
VALUES 
(current_date, 'si', '16-inch MacBook Pro, M3 Max chip with 16‑core CPU and 40‑core GPU, 48GB Unified Memory, 1TB SSD. Space Black.', 'MacBook Pro 16" M3 Max', 
 (SELECT identificador FROM public.personas WHERE email = 'revisor@subastas.com'), 
 (SELECT identificador FROM public.personas WHERE email = 'vendedor@subastas.com'), 
 NULL),
(current_date, 'si', 'Oyster, 41 mm, yellow gold. Blue dial and Cerachrom bezel. Excellent condition, includes certificate.', 'Rolex Submariner Date Gold', 
 (SELECT identificador FROM public.personas WHERE email = 'revisor@subastas.com'), 
 (SELECT identificador FROM public.personas WHERE email = 'vendedor@subastas.com'), 
 NULL),
(current_date, 'si', 'Lego Technic Porsche 911 GT3 RS. Fully assembled with original box, manuals, and spare parts.', 'Porsche 911 GT3 RS (Scale 1:8)', 
 (SELECT identificador FROM public.personas WHERE email = 'revisor@subastas.com'), 
 (SELECT identificador FROM public.personas WHERE email = 'vendedor@subastas.com'), 
 NULL)
ON CONFLICT DO NOTHING;

-- Fotos
INSERT INTO public.fotos (producto, foto)
VALUES 
((SELECT identificador FROM public.productos WHERE descripcionCompleta = 'MacBook Pro 16" M3 Max' LIMIT 1), 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80'),
((SELECT identificador FROM public.productos WHERE descripcionCompleta = 'Rolex Submariner Date Gold' LIMIT 1), 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=600&q=80'),
((SELECT identificador FROM public.productos WHERE descripcionCompleta = 'Porsche 911 GT3 RS (Scale 1:8)' LIMIT 1), 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?auto=format&fit=crop&w=600&q=80')
ON CONFLICT DO NOTHING;

-- Catálogos
INSERT INTO public.catalogos (descripcion, subasta, responsable)
VALUES 
('Catálogo de Subasta Oro', 1, (SELECT identificador FROM public.personas WHERE email = 'revisor@subastas.com')),
('Catálogo de Subasta Común', 2, (SELECT identificador FROM public.personas WHERE email = 'revisor@subastas.com')),
('Catálogo de Subasta Platino', 3, (SELECT identificador FROM public.personas WHERE email = 'revisor@subastas.com'))
ON CONFLICT DO NOTHING;

-- Items de Catálogo
INSERT INTO public.itemsCatalogo (catalogo, producto, precioBase, comision, subastado)
VALUES 
((SELECT identificador FROM public.catalogos WHERE descripcion = 'Catálogo de Subasta Oro' LIMIT 1), (SELECT identificador FROM public.productos WHERE descripcionCompleta = 'MacBook Pro 16" M3 Max' LIMIT 1), 2500, 250, 'no'),
((SELECT identificador FROM public.catalogos WHERE descripcion = 'Catálogo de Subasta Común' LIMIT 1), (SELECT identificador FROM public.productos WHERE descripcionCompleta = 'Rolex Submariner Date Gold' LIMIT 1), 12000, 1200, 'no'),
((SELECT identificador FROM public.catalogos WHERE descripcion = 'Catálogo de Subasta Platino' LIMIT 1), (SELECT identificador FROM public.productos WHERE descripcionCompleta = 'Porsche 911 GT3 RS (Scale 1:8)' LIMIT 1), 400, 40, 'no')
ON CONFLICT DO NOTHING;

-- Asistentes
INSERT INTO public.asistentes (numeroPostor, cliente, subasta)
VALUES 
(25, (SELECT identificador FROM public.personas WHERE email = 'juan@mail.com'), 1),
(25, (SELECT identificador FROM public.personas WHERE email = 'juan@mail.com'), 2),
(25, (SELECT identificador FROM public.personas WHERE email = 'juan@mail.com'), 3)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. POLÍTICAS DE ROW-LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------

-- Bucket para Fotos de DNI
INSERT INTO storage.buckets (id, name, public)
VALUES ('dni-photos', 'dni-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Restricciones únicas requeridas para evitar duplicados en el registro
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'personas_email_unique'
    ) THEN
        ALTER TABLE public.personas ADD CONSTRAINT personas_email_unique UNIQUE (email);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'personas_documento_unique'
    ) THEN
        ALTER TABLE public.personas ADD CONSTRAINT personas_documento_unique UNIQUE (documento);
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN 
        NULL;
END $$;

-- Habilitar RLS en las tablas
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pujos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subastas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itemscatalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas previas
DROP POLICY IF EXISTS "personas_select_everyone" ON public.personas;
DROP POLICY IF EXISTS "personas_insert_everyone" ON public.personas;
DROP POLICY IF EXISTS "personas_update_owner" ON public.personas;
DROP POLICY IF EXISTS "clientes_select_authenticated" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_everyone" ON public.clientes;
DROP POLICY IF EXISTS "asistentes_select_authenticated" ON public.asistentes;
DROP POLICY IF EXISTS "asistentes_insert_authenticated" ON public.asistentes;
DROP POLICY IF EXISTS "pujos_select_authenticated" ON public.pujos;
DROP POLICY IF EXISTS "pujos_insert_authenticated" ON public.pujos;
DROP POLICY IF EXISTS "subastas_select_authenticated" ON public.subastas;
DROP POLICY IF EXISTS "catalogos_select_authenticated" ON public.catalogos;
DROP POLICY IF EXISTS "itemscatalogo_select_authenticated" ON public.itemscatalogo;
DROP POLICY IF EXISTS "productos_select_authenticated" ON public.productos;
DROP POLICY IF EXISTS "fotos_select_authenticated" ON public.fotos;

-- Políticas de Personas
CREATE POLICY "personas_select_everyone" ON public.personas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "personas_insert_everyone" ON public.personas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "personas_update_owner" ON public.personas FOR UPDATE TO authenticated USING (auth.jwt()->>'email' = email);

-- Políticas de Clientes
CREATE POLICY "clientes_select_authenticated" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "clientes_insert_everyone" ON public.clientes FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Políticas de Asistentes
CREATE POLICY "asistentes_select_authenticated" ON public.asistentes FOR SELECT TO authenticated USING (true);
CREATE POLICY "asistentes_insert_authenticated" ON public.asistentes FOR INSERT TO authenticated WITH CHECK (true);

-- Políticas de Pujos
CREATE POLICY "pujos_select_authenticated" ON public.pujos FOR SELECT TO authenticated USING (true);
CREATE POLICY "pujos_insert_authenticated" ON public.pujos FOR INSERT TO authenticated WITH CHECK (true);

-- Políticas de lectura para tablas auxiliares
CREATE POLICY "subastas_select_authenticated" ON public.subastas FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogos_select_authenticated" ON public.catalogos FOR SELECT TO authenticated USING (true);
CREATE POLICY "itemscatalogo_select_authenticated" ON public.itemscatalogo FOR SELECT TO authenticated USING (true);
CREATE POLICY "productos_select_authenticated" ON public.productos FOR SELECT TO authenticated USING (true);
CREATE POLICY "fotos_select_authenticated" ON public.fotos FOR SELECT TO authenticated USING (true);

-- Políticas para Storage de Fotos DNI
DROP POLICY IF EXISTS "Allow public access to dni-photos" ON storage.objects;
CREATE POLICY "Allow public access to dni-photos"
ON storage.objects FOR ALL TO anon, authenticated
USING (bucket_id = 'dni-photos')
WITH CHECK (bucket_id = 'dni-photos');

ALTER TABLE public.mediosdepago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mediosdepago_all_authenticated" ON public.mediosdepago;
DROP POLICY IF EXISTS "multas_all_authenticated" ON public.multas;
DROP POLICY IF EXISTS "notificaciones_all_authenticated" ON public.notificaciones;
DROP POLICY IF EXISTS "paises_select_everyone" ON public.paises;

CREATE POLICY "mediosdepago_all_authenticated" ON public.mediosdepago FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "multas_all_authenticated" ON public.multas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "notificaciones_all_authenticated" ON public.notificaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "paises_select_everyone" ON public.paises FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------
-- 9. Trigger para borrar archivos de Storage cuando se elimina una Persona
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_persona_storage_files()
RETURNS TRIGGER AS $$
BEGIN
    -- NOTA: Se removió la eliminación directa sobre storage.objects
    -- debido a la restricción de seguridad de Supabase (Error 42501).
    -- La limpieza de archivos se realiza ahora desde la app móvil con la Storage API.
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_delete_persona_storage ON public.personas;
CREATE TRIGGER trigger_delete_persona_storage
AFTER DELETE ON public.personas
FOR EACH ROW
EXECUTE FUNCTION public.delete_persona_storage_files();
