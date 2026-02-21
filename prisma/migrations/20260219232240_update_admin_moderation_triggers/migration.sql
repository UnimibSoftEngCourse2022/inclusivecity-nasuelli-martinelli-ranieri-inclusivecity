-- FUNCTION CALCOLO PESO UTENTE
CREATE OR REPLACE FUNCTION get_user_weight(reputation INT)
RETURNS INT AS $$
BEGIN
    IF reputation < 0 THEN RETURN 0; -- utente inaffidabile
    ELSIF reputation >= 0 AND reputation < 20 THEN RETURN 1; -- utente nuovo
    ELSIF reputation >= 20 AND reputation < 50 THEN RETURN 2; -- utente affidabile
    ELSE RETURN 3; -- utente super affidabile
END IF;
END;
$$ LANGUAGE plpgsql;


-- MODERAZIONE AUTOMATICA

-- TRIGGER insert Report
-- Controlla le soglie e cambia lo stato della barriera
CREATE OR REPLACE FUNCTION check_report_thresholds()
RETURNS TRIGGER AS $$
DECLARE
v_total_weight INT;
    v_current_state "BarrierState";
BEGIN
SELECT state INTO v_current_state FROM "Barrier" WHERE id = NEW."barrierId";
IF v_current_state = 'HIDDEN' OR v_current_state = 'RESOLVED' THEN RETURN NEW; END IF;

SELECT COALESCE(SUM(get_user_weight(u."reputationScore")), 0) INTO v_total_weight
FROM "Report" r JOIN "User" u ON r."userId" = u.id
WHERE r."barrierId" = NEW."barrierId" AND r.status = 'PENDING';

IF v_total_weight >= 10 THEN
UPDATE "Barrier" SET state = 'HIDDEN', "updatedAt" = NOW() WHERE id = NEW."barrierId";
ELSIF v_total_weight >= 5 AND v_current_state = 'ACTIVE' THEN
UPDATE "Barrier" SET state = 'IN_REVIEW', "updatedAt" = NOW() WHERE id = NEW."barrierId";
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_report_thresholds ON "Report";
CREATE TRIGGER trigger_check_report_thresholds AFTER INSERT ON "Report" FOR EACH ROW EXECUTE FUNCTION check_report_thresholds();


-- TRIGGER insert Resolution
-- Controlla la soglia di risoluzione e cambia lo stato di risoluzione
CREATE OR REPLACE FUNCTION check_resolution_thresholds()
RETURNS TRIGGER AS $$
DECLARE
v_total_weight INT;
    v_current_state "BarrierState";
BEGIN
SELECT state INTO v_current_state FROM "Barrier" WHERE id = NEW."barrierId";
IF v_current_state = 'HIDDEN' OR v_current_state = 'RESOLVED' THEN RETURN NEW; END IF;

SELECT COALESCE(SUM(get_user_weight(u."reputationScore")), 0) INTO v_total_weight
FROM "Resolution" res JOIN "User" u ON res."userId" = u.id
WHERE res."barrierId" = NEW."barrierId" AND res.status = 'PENDING';

IF v_total_weight >= 8 THEN
UPDATE "Barrier" SET state = 'RESOLVED', "updatedAt" = NOW() WHERE id = NEW."barrierId";
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_resolution_thresholds ON "Resolution";
CREATE TRIGGER trigger_check_resolution_thresholds AFTER INSERT ON "Resolution" FOR EACH ROW EXECUTE FUNCTION check_resolution_thresholds();


-- EFFETTI CAMBIO STATO BARRIERA
CREATE OR REPLACE FUNCTION handle_barrier_state_changes()
RETURNS TRIGGER AS $$
BEGIN
-- * -> HIDDEN
    IF NEW.state = 'HIDDEN' AND OLD.state != 'HIDDEN' THEN
-- penalità autore barriera
UPDATE "User" SET "reputationScore" = "reputationScore" - 5 WHERE id = NEW."userId";
-- premio utenti con segnalazioni PENDING
UPDATE "User" SET "reputationScore" = "reputationScore" + 3
WHERE id IN (SELECT "userId" FROM "Report" WHERE "barrierId" = NEW.id AND status = 'PENDING');
-- tutti i report PENDING -> REVIEWED
UPDATE "Report" SET status = 'REVIEWED', "updatedAt" = NOW()
WHERE "barrierId" = NEW.id AND status = 'PENDING';

-- IN_REVIEW -> ACTIVE
ELSIF NEW.state = 'ACTIVE' AND OLD.state = 'IN_REVIEW' THEN
-- penalità segnalatori
UPDATE "User" SET "reputationScore" = "reputationScore" - 5
WHERE id IN (SELECT "userId" FROM "Report" WHERE "barrierId" = NEW.id AND status = 'PENDING');
-- tutti i report PENDING -> DISMISSED
UPDATE "Report" SET status = 'DISMISSED', "updatedAt" = NOW()
WHERE "barrierId" = NEW.id AND status = 'PENDING';

-- HIDDEN -> ACTIVE
ELSIF NEW.state = 'ACTIVE' AND OLD.state = 'HIDDEN' THEN
-- ripristino punti all'utente che ha creato la barriera
UPDATE "User" SET "reputationScore" = "reputationScore" + 5 WHERE id = NEW."userId";

-- * -> RESOLVED
ELSIF NEW.state = 'RESOLVED' AND OLD.state != 'RESOLVED' THEN
-- tutte le Resolution PENDING -> APPROVED
UPDATE "Resolution" SET status = 'APPROVED', "updatedAt" = NOW()
WHERE "barrierId" = NEW.id AND status = 'PENDING';
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_barrier_state_changes ON "Barrier";
CREATE TRIGGER trigger_barrier_state_changes AFTER UPDATE OF state ON "Barrier" FOR EACH ROW EXECUTE FUNCTION handle_barrier_state_changes();


-- TRIGGER cambio stato Resolution
CREATE OR REPLACE FUNCTION handle_resolution_status_changes()
RETURNS TRIGGER AS $$
BEGIN
-- PENDING -> APPROVED
    IF NEW.status = 'APPROVED' AND OLD.status = 'PENDING' THEN
-- premio utente creatore
UPDATE "User" SET "reputationScore" = "reputationScore" + 5 WHERE id = NEW."userId";
-- barriera * -> RESOLVED
UPDATE "Barrier" SET state = 'RESOLVED', "updatedAt" = NOW()
WHERE id = NEW."barrierId" AND state != 'RESOLVED';

-- PENDING -> REJECTED
ELSIF NEW.status = 'REJECTED' AND OLD.status = 'PENDING' THEN
-- penalità all'autore
UPDATE "User" SET "reputationScore" = "reputationScore" - 5 WHERE id = NEW."userId";
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_resolution_status_changes ON "Resolution";
CREATE TRIGGER trigger_resolution_status_changes AFTER UPDATE OF status ON "Resolution" FOR EACH ROW EXECUTE FUNCTION handle_resolution_status_changes();