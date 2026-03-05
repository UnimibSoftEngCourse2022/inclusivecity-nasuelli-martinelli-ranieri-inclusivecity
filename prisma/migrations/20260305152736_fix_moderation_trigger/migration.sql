-- @formatter:off

-- Sovrascrive la funzione per rimuovere i riferimenti inesistenti a "updatedAt" su Report e Resolution
CREATE OR REPLACE FUNCTION handle_barrier_state_changes() RETURNS TRIGGER AS $$
BEGIN
IF NEW.state = 'HIDDEN' AND OLD.state != 'HIDDEN' THEN
    -- Sottrae punti al creatore
    UPDATE "User" SET "reputationScore" = "reputationScore" - 5 WHERE id = NEW."userId";
    -- Premia chi ha segnalato
    UPDATE "User" SET "reputationScore" = "reputationScore" + 3 WHERE id IN (SELECT "userId" FROM "Report" WHERE "barrierId" = NEW.id AND status = 'PENDING');
    -- Chiude i report
    UPDATE "Report" SET status = 'REVIEWED' WHERE "barrierId" = NEW.id AND status = 'PENDING';

ELSIF NEW.state = 'ACTIVE' AND OLD.state = 'IN_REVIEW' THEN
    -- Penalizza chi ha fatto report falsi
    UPDATE "User" SET "reputationScore" = "reputationScore" - 3 WHERE id IN (SELECT "userId" FROM "Report" WHERE "barrierId" = NEW.id AND status = 'PENDING');
    -- Rigetta i report
    UPDATE "Report" SET status = 'DISMISSED' WHERE "barrierId" = NEW.id AND status = 'PENDING';

ELSIF NEW.state = 'ACTIVE' AND OLD.state = 'HIDDEN' THEN
    -- Restituisce i punti al creatore se la barriera viene riattivata
    UPDATE "User" SET "reputationScore" = "reputationScore" + 5 WHERE id = NEW."userId";

ELSIF NEW.state = 'RESOLVED' AND OLD.state != 'RESOLVED' THEN
    -- Approva le risoluzioni pendenti (Senza updatedAt)
    UPDATE "Resolution" SET status = 'APPROVED' WHERE "barrierId" = NEW.id AND status = 'PENDING';
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- @formatter:on