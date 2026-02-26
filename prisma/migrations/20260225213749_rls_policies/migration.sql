-- @formatter:off

-- ABILITAZIONE RLS SU TUTTE LE TABELLE
ALTER TABLE public."Disability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DeviceToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BarrierType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Barrier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Resolution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;

-- TABELLE DI SUPPORTO (Lettura pubblica, modifica disabilitata da client)
CREATE POLICY "Public Read Disability" ON public."Disability" FOR SELECT USING (true);
CREATE POLICY "Public Read BarrierType" ON public."BarrierType" FOR SELECT USING (true);

-- USER (Tutti possono leggere i profili per vedere chi ha creato le barriere. Solo tu modifichi il tuo)
CREATE POLICY "Public Read User" ON public."User" FOR SELECT USING (true);
CREATE POLICY "Self Update User" ON public."User" FOR UPDATE TO authenticated USING (auth.uid() = id);

-- BARRIER (Lettura pubblica. Inserimento autenticato. Modifica/Eliminazione solo creatore)
CREATE POLICY "Public Read Barrier" ON public."Barrier" FOR SELECT USING (true);
CREATE POLICY "Auth Insert Barrier" ON public."Barrier" FOR INSERT TO authenticated WITH CHECK (auth.uid() = "userId");
CREATE POLICY "Owner Update Barrier" ON public."Barrier" FOR UPDATE TO authenticated USING (auth.uid() = "userId");
CREATE POLICY "Owner Delete Barrier" ON public."Barrier" FOR DELETE TO authenticated USING (auth.uid() = "userId");

-- FEEDBACK E RESOLUTION (Tutti leggono i feedback/prove fotografiche, ma solo l'autore li crea/modifica)
CREATE POLICY "Public Read Feedback" ON public."Feedback" FOR SELECT USING (true);
CREATE POLICY "Auth Insert Feedback" ON public."Feedback" FOR INSERT TO authenticated WITH CHECK (auth.uid() = "userId");
CREATE POLICY "Owner Update Feedback" ON public."Feedback" FOR UPDATE TO authenticated USING (auth.uid() = "userId");
CREATE POLICY "Owner Delete Feedback" ON public."Feedback" FOR DELETE TO authenticated USING (auth.uid() = "userId");

CREATE POLICY "Public Read Resolution" ON public."Resolution" FOR SELECT USING (true);
CREATE POLICY "Auth Insert Resolution" ON public."Resolution" FOR INSERT TO authenticated WITH CHECK (auth.uid() = "userId");
CREATE POLICY "Owner Update Resolution" ON public."Resolution" FOR UPDATE TO authenticated USING (auth.uid() = "userId");

-- REPORT (Privacy massima: solo il backend Admin e l'utente stesso possono vedere i propri Report)
CREATE POLICY "Owner Read Report" ON public."Report" FOR SELECT TO authenticated USING (auth.uid() = "userId");
CREATE POLICY "Auth Insert Report" ON public."Report" FOR INSERT TO authenticated WITH CHECK (auth.uid() = "userId");

-- NOTIFICHE E DEVICE TOKENS (Strettamente personali: un utente vede/modifica solo i suoi)
CREATE POLICY "Owner All Tokens" ON public."DeviceToken" FOR ALL TO authenticated USING (auth.uid() = "userId");
CREATE POLICY "Owner All Notifications" ON public."Notification" FOR ALL TO authenticated USING (auth.uid() = "userId");

-- CONFIGURAZIONE RUOLI E PERMESSI BASE SUPABASE
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- @formatter:on