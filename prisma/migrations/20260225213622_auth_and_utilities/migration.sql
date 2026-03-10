-- @formatter:off

-- MOCK SCHEMA AUTH (Necessario per lo shadow database di Prisma)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        EXECUTE 'CREATE SCHEMA auth';
END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
        EXECUTE 'CREATE TABLE auth.users (id uuid NOT NULL PRIMARY KEY, email text, raw_user_meta_data jsonb)';
END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'auth' AND p.proname = 'uid') THEN
        EXECUTE 'CREATE FUNCTION auth.uid() RETURNS uuid AS ''SELECT ''''00000000-0000-0000-0000-000000000000''''::uuid;'' LANGUAGE SQL';
END IF;
END $$;

-- TRIGGER: Sincronizzazione Supabase Auth -> public.User
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
DECLARE
u_first_name text; u_last_name text; u_full_name text;
BEGIN
    u_first_name := new.raw_user_meta_data->>'firstName';
    u_last_name := new.raw_user_meta_data->>'lastName';

    IF u_first_name IS NULL THEN
        u_full_name := new.raw_user_meta_data->>'full_name';
        IF u_full_name IS NOT NULL THEN
            u_first_name := split_part(u_full_name, ' ', 1);
            u_last_name := NULLIF(TRIM(SUBSTRING(u_full_name FROM LENGTH(u_first_name) + 1)), '');
END IF;
END IF;

    IF u_first_name IS NULL THEN u_first_name := 'Utente'; END IF;
    IF u_last_name IS NULL THEN u_last_name := ''; END IF;

INSERT INTO public."User" (id, email, "firstName", "lastName", role, "createdAt")
VALUES (new.id, new.email, u_first_name, u_last_name, 'USER', NOW());
RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- TRIGGER: Aggiornamento Media Voti Barriera
CREATE OR REPLACE FUNCTION update_barrier_rating() RETURNS TRIGGER AS $$
BEGIN
UPDATE "Barrier"
SET "averageRating" = (SELECT COALESCE(AVG(rating), 0) FROM "Feedback" WHERE "barrierId" = COALESCE(NEW."barrierId", OLD."barrierId")),
    "totalRatings"  = (SELECT COUNT(*) FROM "Feedback" WHERE "barrierId" = COALESCE(NEW."barrierId", OLD."barrierId")),
    "updatedAt"     = NOW()
WHERE id = COALESCE(NEW."barrierId", OLD."barrierId");
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feedback_insert ON "Feedback";
CREATE TRIGGER feedback_insert AFTER INSERT ON "Feedback" FOR EACH ROW EXECUTE FUNCTION update_barrier_rating();

DROP TRIGGER IF EXISTS feedback_update ON "Feedback";
CREATE TRIGGER feedback_update AFTER UPDATE ON "Feedback" FOR EACH ROW EXECUTE FUNCTION update_barrier_rating();

DROP TRIGGER IF EXISTS feedback_delete ON "Feedback";
CREATE TRIGGER feedback_delete AFTER DELETE ON "Feedback" FOR EACH ROW EXECUTE FUNCTION update_barrier_rating();

-- @formatter:on