-- =====================================================================
-- SUPABASE ROW-LEVEL SECURITY (RLS) SETUP SCRIPT
-- =====================================================================
-- Copy and run this script in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- to secure all app tables with RLS and define required access policies.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Create Storage Bucket 'dni-photos' if it does not exist
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('dni-photos', 'dni-photos', true)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 0.1 Add Unique Constraints to 'personas' (Email and Documento)
-- ---------------------------------------------------------------------
-- This ensures only one profile/registration is allowed per email/document.
-- Note: If you have existing duplicate test records, you must clean them up first!
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

-- ---------------------------------------------------------------------
-- 1. Enable Row Level Security (RLS) on all tables
-- ---------------------------------------------------------------------
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pujos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subastas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itemscatalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 2. Drop existing policies to avoid conflicts (Idempotency)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "personas_select_authenticated" ON public.personas;
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

-- ---------------------------------------------------------------------
-- 3. Define Policies for Personas
-- ---------------------------------------------------------------------
-- Allow both anon and authenticated users to read profiles (needed to read inserted rows and view bidder names)
CREATE POLICY "personas_select_everyone" ON public.personas
  FOR SELECT TO anon, authenticated USING (true);

-- Allow both anon and authenticated to insert (needed for pre-registration form)
CREATE POLICY "personas_insert_everyone" ON public.personas
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Allow both anon and authenticated to update profile details (needed for direct DB login updates)
CREATE POLICY "personas_update_everyone" ON public.personas
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 4. Define Policies for Clientes
-- ---------------------------------------------------------------------
-- Allow both anon and authenticated users to view customer metadata
CREATE POLICY "clientes_select_everyone" ON public.clientes
  FOR SELECT TO anon, authenticated USING (true);

-- Allow anon and authenticated to insert (needed for pre-registration and approval)
CREATE POLICY "clientes_insert_everyone" ON public.clientes
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 5. Define Policies for Asistentes (Subastas Registration)
-- ---------------------------------------------------------------------
-- Allow both anon and authenticated users to view assistant lists
CREATE POLICY "asistentes_select_everyone" ON public.asistentes
  FOR SELECT TO anon, authenticated USING (true);

-- Allow both anon and authenticated users to join/register for auctions
CREATE POLICY "asistentes_insert_everyone" ON public.asistentes
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 6. Define Policies for Pujos (Bids)
-- ---------------------------------------------------------------------
-- Allow both anon and authenticated users to read bid listings
CREATE POLICY "pujos_select_everyone" ON public.pujos
  FOR SELECT TO anon, authenticated USING (true);

-- Allow both anon and authenticated users to place new bids
CREATE POLICY "pujos_insert_everyone" ON public.pujos
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 7. Define Read-Only Policies for Catalog & Auction Tables
-- ---------------------------------------------------------------------
-- Allow both anon and authenticated users to browse catalog data, preventing updates/deletes.
CREATE POLICY "subastas_select_everyone" ON public.subastas
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "catalogos_select_everyone" ON public.catalogos
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "itemscatalogo_select_everyone" ON public.itemscatalogo
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "productos_select_everyone" ON public.productos
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "productos_insert_everyone" ON public.productos
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "fotos_select_everyone" ON public.fotos
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "fotos_insert_everyone" ON public.fotos
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 8. Storage Policies for 'dni-photos' bucket
-- ---------------------------------------------------------------------
-- Ensure RLS is active on storage metadata table and configure policies for the 'dni-photos' folder.
DROP POLICY IF EXISTS "Allow public uploads to dni-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from dni-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to dni-photos" ON storage.objects;

CREATE POLICY "Allow public access to dni-photos"
ON storage.objects FOR ALL TO anon, authenticated
USING (bucket_id = 'dni-photos')
WITH CHECK (bucket_id = 'dni-photos');

-- =====================================================================
-- END OF SCRIPT
-- =====================================================================
