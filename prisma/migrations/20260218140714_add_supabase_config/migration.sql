-- AlterTable
ALTER TABLE "Disability"
    ADD COLUMN "iconName" TEXT NOT NULL;

-- TRIGGER E FUNCTION INSERITI DA SUPABASE su schema auth

-- MOCK x shadow db
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        EXECUTE 'CREATE SCHEMA auth';
END IF;

    IF
NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
        EXECUTE 'CREATE TABLE auth.users (id uuid NOT NULL PRIMARY KEY, email text, raw_user_meta_data jsonb)';
END IF;

    IF
NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'auth' AND p.proname = 'uid'
    ) THEN
        EXECUTE 'CREATE FUNCTION auth.uid() RETURNS uuid AS ''SELECT ''''00000000-0000-0000-0000-000000000000''''::uuid;'' LANGUAGE SQL';
END IF;
END $$;

-- FUNCTION insert User from auth
CREATE
OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
u_first_name text;
    u_last_name
text;
    u_full_name
text;
BEGIN
    u_first_name
:= new.raw_user_meta_data->>'firstName';
    u_last_name
:= new.raw_user_meta_data->>'lastName';

    IF
u_first_name IS NULL THEN
        u_full_name := new.raw_user_meta_data->>'full_name';

        IF
u_full_name IS NOT NULL THEN
            u_first_name := split_part(u_full_name, ' ', 1);
            u_last_name
:= NULLIF(TRIM(SUBSTRING(u_full_name FROM LENGTH(u_first_name) + 1)), '');
END IF;
END IF;
    IF
u_first_name IS NULL THEN u_first_name := 'Utente';
END IF;
    IF
u_last_name IS NULL THEN u_last_name := '';
END IF;

INSERT INTO public."User" (id, email, "firstName", "lastName", role, "createdAt")
VALUES (new.id,
        new.email,
        u_first_name,
        u_last_name,
        'USER',
        NOW());
RETURN new;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER on insert in auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT
    ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

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