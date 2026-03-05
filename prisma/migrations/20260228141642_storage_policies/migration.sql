-- MOCK SCHEMA STORAGE (Necessario per lo shadow database di Prisma)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
        EXECUTE 'CREATE SCHEMA storage';
END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
        EXECUTE 'CREATE TABLE storage.objects (id uuid NOT NULL PRIMARY KEY, bucket_id text, name text, owner uuid)';
END IF;
END $$;

DROP POLICY IF EXISTS "Public Read Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Insert own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Update own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Delete own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Insert general photos" ON storage.objects;
DROP POLICY IF EXISTS "Update own general photos" ON storage.objects;
DROP POLICY IF EXISTS "Delete own general photos" ON storage.objects;

-- LETTURA PUBBLICA (Tutti possono vedere le immagini)
CREATE POLICY "Public Read Buckets"
ON storage.objects FOR SELECT
USING (bucket_id IN ('profile-pictures', 'barrier-photos', 'resolution-evidence'));

-- BUCKET: profile-pictures
-- Sicurezza extra: Puoi caricare un file solo se il nome inizia per "avatar-IL_TUO_ID"
CREATE POLICY "Insert own profile picture"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'profile-pictures' AND
    name LIKE 'avatar-' || auth.uid()::text || '.%'
);

-- Puoi modificare o cancellare solo i file di cui sei il creatore originale (owner)
CREATE POLICY "Update own profile picture"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-pictures' AND auth.uid() = owner);

CREATE POLICY "Delete own profile picture"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-pictures' AND auth.uid() = owner);


-- 3. BUCKET: barrier-photos E resolution-evidence
-- Qualsiasi utente loggato può aggiungere nuove foto in questi bucket
CREATE POLICY "Insert general photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id IN ('barrier-photos', 'resolution-evidence')
);

-- Puoi modificare o cancellare solo le foto che hai caricato tu
CREATE POLICY "Update own general photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('barrier-photos', 'resolution-evidence') AND auth.uid() = owner);

CREATE POLICY "Delete own general photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('barrier-photos', 'resolution-evidence') AND auth.uid() = owner);