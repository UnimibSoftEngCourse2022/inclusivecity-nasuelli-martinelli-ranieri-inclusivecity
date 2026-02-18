-- TRIGGER E FUNCTION INSERITI DA SUPABASE su schema auth
-- FUNCTION insert User from auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
u_first_name text;
    u_last_name text;
    u_full_name text;
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
VALUES (
           new.id,
           new.email,
           u_first_name,
           u_last_name,
           'USER',
           NOW()
       );
RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER on insert in auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();