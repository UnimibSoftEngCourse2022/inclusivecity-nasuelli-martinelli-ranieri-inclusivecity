-- RLS RULES
-- TABELLA USER
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

DROP
POLICY IF EXISTS "Public Read User" ON public."User";
DROP
POLICY IF EXISTS "Self Update User" ON public."User";

-- Policy: Tutti possono leggere i profili (necessario per vedere gli autori delle barriere)
CREATE
POLICY "Public Read User"
ON public."User" FOR
SELECT
    USING (true);

-- Policy: Solo l'utente può modificare il proprio profilo
CREATE
POLICY "Self Update User"
ON public."User" FOR
UPDATE
    TO authenticated
    USING (auth.uid() = id);


-- TABELLA DISABILITY
ALTER TABLE public."Disability" ENABLE ROW LEVEL SECURITY;

DROP
POLICY IF EXISTS "Public Read Disability" ON public."Disability";

-- Policy: Lettura pubblica per popolare la select dell'onboarding
CREATE
POLICY "Public Read Disability"
ON public."Disability" FOR
SELECT
    USING (true);


-- TABELLA BARRIER
ALTER TABLE public."Barrier" ENABLE ROW LEVEL SECURITY;

DROP
POLICY IF EXISTS "Public Read Barrier" ON public."Barrier";
DROP
POLICY IF EXISTS "Authenticated Insert Barrier" ON public."Barrier";
DROP
POLICY IF EXISTS "Owner Update Barrier" ON public."Barrier";
DROP
POLICY IF EXISTS "Owner Delete Barrier" ON public."Barrier";

-- Policy: Chiunque può vedere le barriere sulla mappa
CREATE
POLICY "Public Read Barrier"
ON public."Barrier" FOR
SELECT
    USING (true);

-- Policy: Solo utenti loggati possono creare barriere
CREATE
POLICY "Authenticated Insert Barrier"
ON public."Barrier" FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "userId");

-- Policy: L'autore può modificare le proprie barriere
CREATE
POLICY "Owner Update Barrier"
ON public."Barrier" FOR
UPDATE
    TO authenticated
    USING (auth.uid() = "userId");

-- Policy: L'autore può cancellare le proprie barriere
CREATE
POLICY "Owner Delete Barrier"
ON public."Barrier" FOR DELETE
TO authenticated
USING (auth.uid() = "userId");


-- TABELLA BARRIER TYPE
ALTER TABLE public."BarrierType" ENABLE ROW LEVEL SECURITY;

DROP
POLICY IF EXISTS "Public Read BarrierType" ON public."BarrierType";

-- Policy: Lettura pubblica per icone e colori sulla mappa
CREATE
POLICY "Public Read BarrierType"
ON public."BarrierType" FOR
SELECT
    USING (true);

-- CONFIG ruoli supabase
GRANT
USAGE
ON
SCHEMA
public TO anon, authenticated;

GRANT ALL
ON ALL TABLES IN SCHEMA public TO anon, authenticated;

GRANT ALL
ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER
DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER
DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;