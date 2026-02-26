-- @formatter:off

-- CREAZIONE E AGGIORNAMENTO BUCKET
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES
    ('profile-pictures', 'profile-pictures', true, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[], 5242880),
    ('barrier-photos', 'barrier-photos', true, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[], 5242880),
    ('resolution-evidence', 'resolution-evidence', true, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[], 5242880)
    ON CONFLICT (id) DO UPDATE SET
        public = EXCLUDED.public,
        allowed_mime_types = EXCLUDED.allowed_mime_types,
        file_size_limit = EXCLUDED.file_size_limit;


-- PULIZIA VECCHIE POLICY
DROP POLICY IF EXISTS "Public Read Buckets" ON storage.objects;

DROP POLICY IF EXISTS "Insert own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Update own profile picture" ON storage.objects;

DROP POLICY IF EXISTS "Insert general photos" ON storage.objects;
DROP POLICY IF EXISTS "Update own general photos" ON storage.objects;
DROP POLICY IF EXISTS "Delete own general photos" ON storage.objects;


-- NUOVE POLICY DI LETTURA (TUTTI I BUCKET)
-- Chiunque può vedere le foto profilo, le foto delle barriere e le prove di risoluzione
CREATE POLICY "Public Read Buckets"
ON storage.objects FOR SELECT
USING (bucket_id IN ('profile-pictures', 'barrier-photos', 'resolution-evidence'));


-- POLICY PER 'profile-pictures'
-- L'utente può caricare/aggiornare solo file il cui nome (prima del punto) è il suo ID utente
CREATE POLICY "Insert own profile picture"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = SPLIT_PART(name, '.', 1)
);

CREATE POLICY "Update own profile picture"
ON storage.objects FOR UPDATE TO authenticated
 USING (
     bucket_id = 'profile-pictures' AND
     auth.uid()::text = SPLIT_PART(name, '.', 1)
 );


-- POLICY PER 'barrier-photos' e 'resolution-evidence'
-- Inserimento consentito a tutti gli utenti loggati
CREATE POLICY "Insert general photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('barrier-photos', 'resolution-evidence'));

-- Modifica o cancellazione consentita solo a chi ha originariamente caricato il file (owner)
CREATE POLICY "Update own general photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('barrier-photos', 'resolution-evidence') AND auth.uid() = owner);

CREATE POLICY "Delete own general photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('barrier-photos', 'resolution-evidence') AND auth.uid() = owner);

-- @formatter:on