-- TRIGGER E FUNCTION INSERITI DA SUPABASE su schema auth
-- FUNCTION insert User from auht
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
INSERT INTO public."User" (id, email, "firstName", "lastName", role, "createdAt")
VALUES (
           new.id,
           new.email,
           new.raw_user_meta_data->>'firstName',
           new.raw_user_meta_data->>'lastName',
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