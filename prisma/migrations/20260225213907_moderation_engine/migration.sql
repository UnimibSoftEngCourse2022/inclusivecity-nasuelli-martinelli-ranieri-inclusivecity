-- @formatter:off

-- FUNZIONE PESO
CREATE OR REPLACE FUNCTION get_user_weight(reputation INT) RETURNS INT AS $$
BEGIN
    IF reputation < 0 THEN RETURN 0;
    ELSIF reputation >= 0 AND reputation < 20 THEN RETURN 1;
    ELSIF reputation >= 20 AND reputation < 50 THEN RETURN 2;
ELSE RETURN 3; END IF;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER CAUSA: REPORT
CREATE OR REPLACE FUNCTION check_report_thresholds() RETURNS TRIGGER AS $$
DECLARE v_total_weight INT; v_current_state "BarrierState";
BEGIN
SELECT state INTO v_current_state FROM "Barrier" WHERE id = NEW."barrierId";
IF v_current_state = 'HIDDEN' OR v_current_state = 'RESOLVED' THEN RETURN NEW; END IF;
SELECT COALESCE(SUM(get_user_weight(u."reputationScore")), 0) INTO v_total_weight FROM "Report" r JOIN "User" u ON r."userId" = u.id WHERE r."barrierId" = NEW."barrierId" AND r.status = 'PENDING';

IF v_total_weight >= 10 THEN
UPDATE "Barrier" SET state = 'HIDDEN', "updatedAt" = NOW() WHERE id = NEW."barrierId";
ELSIF v_total_weight >= 5 AND v_current_state = 'ACTIVE' THEN
UPDATE "Barrier" SET state = 'IN_REVIEW', "updatedAt" = NOW() WHERE id = NEW."barrierId";
END IF; RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_check_report_thresholds ON "Report";
CREATE TRIGGER trigger_check_report_thresholds AFTER INSERT ON "Report" FOR EACH ROW EXECUTE FUNCTION check_report_thresholds();

-- TRIGGER CAUSA: RESOLUTION
CREATE OR REPLACE FUNCTION check_resolution_thresholds() RETURNS TRIGGER AS $$
DECLARE v_total_weight INT; v_current_state "BarrierState";
BEGIN
SELECT state INTO v_current_state FROM "Barrier" WHERE id = NEW."barrierId";
IF v_current_state = 'HIDDEN' OR v_current_state = 'RESOLVED' THEN RETURN NEW; END IF;
SELECT COALESCE(SUM(get_user_weight(u."reputationScore")), 0) INTO v_total_weight FROM "Resolution" res JOIN "User" u ON res."userId" = u.id WHERE res."barrierId" = NEW."barrierId" AND res.status = 'PENDING';

IF v_total_weight >= 8 THEN
UPDATE "Barrier" SET state = 'RESOLVED', "updatedAt" = NOW() WHERE id = NEW."barrierId";
END IF; RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_check_resolution_thresholds ON "Resolution";
CREATE TRIGGER trigger_check_resolution_thresholds AFTER INSERT ON "Resolution" FOR EACH ROW EXECUTE FUNCTION check_resolution_thresholds();

-- TRIGGER EFFETTO: CAMBIO STATO BARRIERA
CREATE OR REPLACE FUNCTION handle_barrier_state_changes() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.state = 'HIDDEN' AND OLD.state != 'HIDDEN' THEN
UPDATE "User" SET "reputationScore" = "reputationScore" - 5 WHERE id = NEW."userId";
UPDATE "User" SET "reputationScore" = "reputationScore" + 3 WHERE id IN (SELECT "userId" FROM "Report" WHERE "barrierId" = NEW.id AND status = 'PENDING');
UPDATE "Report" SET status = 'REVIEWED', "updatedAt" = NOW() WHERE "barrierId" = NEW.id AND status = 'PENDING';
ELSIF NEW.state = 'ACTIVE' AND OLD.state = 'IN_REVIEW' THEN
UPDATE "User" SET "reputationScore" = "reputationScore" - 3 WHERE id IN (SELECT "userId" FROM "Report" WHERE "barrierId" = NEW.id AND status = 'PENDING');
UPDATE "Report" SET status = 'DISMISSED', "updatedAt" = NOW() WHERE "barrierId" = NEW.id AND status = 'PENDING';
ELSIF NEW.state = 'ACTIVE' AND OLD.state = 'HIDDEN' THEN
UPDATE "User" SET "reputationScore" = "reputationScore" + 5 WHERE id = NEW."userId";
ELSIF NEW.state = 'RESOLVED' AND OLD.state != 'RESOLVED' THEN
UPDATE "Resolution" SET status = 'APPROVED', "updatedAt" = NOW() WHERE "barrierId" = NEW.id AND status = 'PENDING';
END IF; RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_barrier_state_changes ON "Barrier";
CREATE TRIGGER trigger_barrier_state_changes AFTER UPDATE OF state ON "Barrier" FOR EACH ROW EXECUTE FUNCTION handle_barrier_state_changes();

-- TRIGGER EFFETTO: CAMBIO STATO RESOLUTION
CREATE OR REPLACE FUNCTION handle_resolution_status_changes() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'APPROVED' AND OLD.status = 'PENDING' THEN
UPDATE "User" SET "reputationScore" = "reputationScore" + 5 WHERE id = NEW."userId";
UPDATE "Barrier" SET state = 'RESOLVED', "updatedAt" = NOW() WHERE id = NEW."barrierId" AND state != 'RESOLVED';
ELSIF NEW.status = 'REJECTED' AND OLD.status = 'PENDING' THEN
UPDATE "User" SET "reputationScore" = "reputationScore" - 3 WHERE id = NEW."userId";
END IF; RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_resolution_status_changes ON "Resolution";
CREATE TRIGGER trigger_resolution_status_changes AFTER UPDATE OF status ON "Resolution" FOR EACH ROW EXECUTE FUNCTION handle_resolution_status_changes();

-- @formatter:on