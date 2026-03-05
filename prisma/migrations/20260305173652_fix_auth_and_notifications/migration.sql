-- @formatter:off

-- RPC per gestione device tokens
CREATE OR REPLACE FUNCTION public.register_device_token(p_token text, p_device_type text)
RETURNS void AS $$
BEGIN
INSERT INTO public."DeviceToken" (id, token, "deviceType", "userId", "lastUsedAt")
VALUES (gen_random_uuid()::text, p_token, p_device_type, auth.uid(), NOW())
ON CONFLICT (token)
DO UPDATE SET
    "lastUsedAt" = NOW(),
    "userId" = auth.uid(),
    "deviceType" = p_device_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- FUNCTION sync nuovo utente tra auth.user e public.User
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
VALUES (new.id, new.email, u_first_name, u_last_name, 'USER', NOW())
    ON CONFLICT (id) DO NOTHING;

RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER su insert (registrazione) o update (login)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- @formatter:on