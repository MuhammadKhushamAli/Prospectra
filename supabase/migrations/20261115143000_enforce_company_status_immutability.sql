-- Enforce company status immutability:
-- Once a company is rejected, its status cannot be changed again.
-- Once a company is accepted ('approved', 'email_drafted', 'pending_send_approval', 'sent', 'replied'),
-- it cannot be rejected or reset back to pending.

CREATE OR REPLACE FUNCTION enforce_company_status_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. If company is already rejected, its status can NEVER be changed again
    IF OLD.status = 'rejected'::company_status AND NEW.status <> 'rejected'::company_status THEN
        RAISE EXCEPTION 'Company has been rejected and its status cannot be changed again.';
    END IF;

    -- 2. If company is already accepted, it cannot be rejected or reverted to pending
    IF OLD.status IN (
        'approved'::company_status,
        'email_drafted'::company_status,
        'pending_send_approval'::company_status,
        'sent'::company_status,
        'replied'::company_status
    ) THEN
        IF NEW.status = 'rejected'::company_status THEN
            RAISE EXCEPTION 'Company has already been accepted and cannot be rejected.';
        END IF;
        IF NEW.status IN ('pending_review'::company_status, 'discovered'::company_status, 'enriched'::company_status) THEN
            RAISE EXCEPTION 'Company has already been accepted and cannot be reset to pending.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_company_status_immutability ON companies;
CREATE TRIGGER trg_enforce_company_status_immutability
BEFORE UPDATE OF status ON companies
FOR EACH ROW
EXECUTE FUNCTION enforce_company_status_immutability();
