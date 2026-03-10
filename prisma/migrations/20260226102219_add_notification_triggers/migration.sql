-- @formatter:off

-- TRIGGER: NUOVO FEEDBACK
-- Genera una notifica per il creatore della barriera quando qualcuno lascia una recensione
CREATE OR REPLACE FUNCTION notify_new_feedback() RETURNS TRIGGER AS $$
DECLARE
    v_barrier_owner UUID;
    v_barrier_title TEXT;
    v_user_name TEXT;
BEGIN
-- Trova il creatore e il titolo della barriera
SELECT "userId", title INTO v_barrier_owner, v_barrier_title FROM "Barrier" WHERE id = NEW."barrierId";

-- Evita di auto-notificare l'utente se commenta la propria barriera
IF v_barrier_owner = NEW."userId" THEN
        RETURN NEW;
END IF;

-- Prendi il nome di chi ha lasciato il feedback
SELECT "firstName" INTO v_user_name FROM "User" WHERE id = NEW."userId";

INSERT INTO "Notification" (id, title, body, type, "userId", "barrierId", "createdAt")
VALUES (
           gen_random_uuid()::text,
           'Nuovo feedback',
           v_user_name || ' ha lasciato un feedback sulla tua barriera: ' || v_barrier_title,
           'NEW_FEEDBACK',
           v_barrier_owner,
           NEW."barrierId",
           NOW()
       );
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_feedback ON "Feedback";
CREATE TRIGGER trigger_notify_new_feedback AFTER INSERT ON "Feedback" FOR EACH ROW EXECUTE FUNCTION notify_new_feedback();


-- TRIGGER: CAMBIO STATO RESOLUTION (Approvata / Rifiutata)
-- Notifica l'utente che ha proposto la risoluzione quando un Admin la valuta
CREATE OR REPLACE FUNCTION notify_resolution_status() RETURNS TRIGGER AS $$
DECLARE
v_barrier_title TEXT;
BEGIN
-- Agisci solo se lo stato è effettivamente cambiato
IF NEW.status = OLD.status THEN
    RETURN NEW;
END IF;

SELECT title INTO v_barrier_title FROM "Barrier" WHERE id = NEW."barrierId";

IF NEW.status = 'APPROVED' THEN
    INSERT INTO "Notification" (id, title, body, type, "userId", "barrierId", "createdAt")
    VALUES (gen_random_uuid()::text, 'Risoluzione Approvata 🎉', 'La tua prova di risoluzione per "' || v_barrier_title || '" è stata approvata. Hai guadagnato punti reputazione!', 'RESOLUTION_APPROVED', NEW."userId", NEW."barrierId", NOW());
ELSIF NEW.status = 'REJECTED' THEN
    INSERT INTO "Notification" (id, title, body, type, "userId", "barrierId", "createdAt")
    VALUES (gen_random_uuid()::text, 'Risoluzione Rifiutata', 'La tua prova di risoluzione per "' || v_barrier_title || '" non è stata ritenuta valida.', 'RESOLUTION_REJECTED', NEW."userId", NEW."barrierId", NOW());
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_resolution_status ON "Resolution";
CREATE TRIGGER trigger_notify_resolution_status AFTER UPDATE OF status ON "Resolution" FOR EACH ROW EXECUTE FUNCTION notify_resolution_status();


-- TRIGGER: CAMBIO STATO REPORT (Accettato / Rifiutato)
-- Notifica l'utente che ha segnalato un problema quando viene preso un provvedimento
CREATE OR REPLACE FUNCTION notify_report_status() RETURNS TRIGGER AS $$
DECLARE
v_barrier_title TEXT;
BEGIN
IF NEW.status = OLD.status THEN
    RETURN NEW;
END IF;

SELECT title INTO v_barrier_title FROM "Barrier" WHERE id = NEW."barrierId";

IF NEW.status = 'REVIEWED' THEN
    INSERT INTO "Notification" (id, title, body, type, "userId", "barrierId", "createdAt")
    VALUES (gen_random_uuid()::text, 'Segnalazione Accettata', 'Il tuo report per "' || v_barrier_title || '" è stato verificato. Grazie per il contributo!', 'REPORT_REVIEWED', NEW."userId", NEW."barrierId", NOW());
ELSIF NEW.status = 'DISMISSED' THEN
    INSERT INTO "Notification" (id, title, body, type, "userId", "barrierId", "createdAt")
    VALUES (gen_random_uuid()::text, 'Segnalazione Rifiutata', 'Il tuo report per "' || v_barrier_title || '" è stato scartato dopo la revisione.', 'REPORT_DISMISSED', NEW."userId", NEW."barrierId", NOW());
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_report_status ON "Report";
CREATE TRIGGER trigger_notify_report_status AFTER UPDATE OF status ON "Report" FOR EACH ROW EXECUTE FUNCTION notify_report_status();


-- TRIGGER: CAMBIO STATO BARRIERA (Risolta / Nascosta)
-- Notifica il creatore originale della barriera quando il suo stato cambia globalmente
CREATE OR REPLACE FUNCTION notify_barrier_state() RETURNS TRIGGER AS $$
BEGIN
IF NEW.state = OLD.state THEN
    RETURN NEW;
END IF;

IF NEW.state = 'RESOLVED' THEN
    INSERT INTO "Notification" (id, title, body, type, "userId", "barrierId", "createdAt")
    VALUES (gen_random_uuid()::text, 'Barriera Risolta! 🥳', 'La barriera "' || NEW.title || '" che avevi mappato è stata fisicamente risolta!', 'BARRIER_RESOLVED', NEW."userId", NEW.id, NOW());

ELSIF NEW.state = 'HIDDEN' THEN
    INSERT INTO "Notification" (id, title, body, type, "userId", "barrierId", "createdAt")
    VALUES (gen_random_uuid()::text, 'Barriera Nascosta ⚠️', 'La tua segnalazione "' || NEW.title || '" è stata nascosta dalla community per via di molteplici report.', 'BARRIER_HIDDEN', NEW."userId", NEW.id, NOW());
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_barrier_state ON "Barrier";
CREATE TRIGGER trigger_notify_barrier_state AFTER UPDATE OF state ON "Barrier" FOR EACH ROW EXECUTE FUNCTION notify_barrier_state();

-- @formatter:on