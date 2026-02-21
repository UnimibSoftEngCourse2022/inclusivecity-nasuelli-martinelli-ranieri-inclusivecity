-- FUNCTION calcolo peso utente
CREATE OR REPLACE FUNCTION get_user_weight(reputation INT)
RETURNS INT AS $$
BEGIN
    IF reputation < 0 THEN
        RETURN 0; -- Utente non affidabile (troll/spammer)
    ELSIF reputation >= 0 AND reputation < 20 THEN
        RETURN 1; -- Utente standard / nuovo
    ELSIF reputation >= 20 AND reputation < 50 THEN
        RETURN 2; -- Utente affidabile
ELSE
        RETURN 3; -- Utente veterano (reputation >= 50)
END IF;
END;
$$ LANGUAGE plpgsql;


-- TRIGGER gestione automatica dei Report (ACTIVE -> IN_REVIEW -> HIDDEN)
CREATE OR REPLACE FUNCTION handle_barrier_reports()
RETURNS TRIGGER AS $$
DECLARE
v_total_weight INT;
    v_current_state "BarrierState";
    v_barrier_author_id TEXT;
BEGIN

SELECT state, "userId" INTO v_current_state, v_barrier_author_id
FROM "Barrier" WHERE id = NEW."barrierId";

-- se la barriera è già nascosta o risolta stop
IF v_current_state = 'HIDDEN' OR v_current_state = 'RESOLVED' THEN
        RETURN NEW;
END IF;

-- calcolo somma dei pesi di tutti i Report PENDING per questa barriera
SELECT COALESCE(SUM(get_user_weight(u."reputationScore")), 0) INTO v_total_weight
FROM "Report" r
         JOIN "User" u ON r."userId" = u.id
WHERE r."barrierId" = NEW."barrierId" AND r.status = 'PENDING';

-- SOGLIA 10: -> HIDDEN, penalità autore e premio segnalatori
IF v_total_weight >= 10 THEN
UPDATE "Barrier" SET state = 'HIDDEN', "updatedAt" = NOW() WHERE id = NEW."barrierId";

UPDATE "User" SET "reputationScore" = "reputationScore" - 5 WHERE id = v_barrier_author_id;

UPDATE "User" SET "reputationScore" = "reputationScore" + 3
WHERE id IN (
    SELECT "userId" FROM "Report" WHERE "barrierId" = NEW."barrierId" AND status = 'PENDING'
);

-- tutti i report PENDING -> REVIEWED
UPDATE "Report" SET status = 'REVIEWED', "updatedAt" = NOW()
WHERE "barrierId" = NEW."barrierId" AND status = 'PENDING';

-- SOGLIA 5: ACTIVE -> IN_REVIEW
ELSIF v_total_weight >= 5 AND v_current_state = 'ACTIVE' THEN
UPDATE "Barrier" SET state = 'IN_REVIEW', "updatedAt" = NOW() WHERE id = NEW."barrierId";
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_handle_reports ON "Report";
CREATE TRIGGER trigger_handle_reports
    AFTER INSERT ON "Report"
    FOR EACH ROW EXECUTE FUNCTION handle_barrier_reports();


-- TRIGGER gestione automatica delle Resolution (ACTIVE/IN_REVIEW -> RESOLVED)
CREATE OR REPLACE FUNCTION handle_barrier_resolutions()
RETURNS TRIGGER AS $$
DECLARE
v_total_weight INT;
    v_current_state "BarrierState";
BEGIN
SELECT state INTO v_current_state
FROM "Barrier" WHERE id = NEW."barrierId";

IF v_current_state = 'HIDDEN' OR v_current_state = 'RESOLVED' THEN
        RETURN NEW;
END IF;

-- calcolo peso Resolution PENDING
SELECT COALESCE(SUM(get_user_weight(u."reputationScore")), 0) INTO v_total_weight
FROM "Resolution" res
         JOIN "User" u ON res."userId" = u.id
WHERE res."barrierId" = NEW."barrierId" AND res.status = 'PENDING';

-- SOGLIA 8: Resolution confermata, bonus utenti creatori
IF v_total_weight >= 8 THEN
UPDATE "Barrier" SET state = 'RESOLVED', "updatedAt" = NOW() WHERE id = NEW."barrierId";

UPDATE "User" SET "reputationScore" = "reputationScore" + 5
WHERE id IN (
    SELECT "userId" FROM "Resolution" WHERE "barrierId" = NEW."barrierId" AND status = 'PENDING'
);

-- tutte le Resolution PENDING -> APPROVED
UPDATE "Resolution" SET status = 'APPROVED', "updatedAt" = NOW()
WHERE "barrierId" = NEW."barrierId" AND status = 'PENDING';
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_handle_resolutions ON "Resolution";
CREATE TRIGGER trigger_handle_resolutions
    AFTER INSERT ON "Resolution"
    FOR EACH ROW EXECUTE FUNCTION handle_barrier_resolutions();