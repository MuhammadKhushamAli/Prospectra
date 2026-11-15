-- Update enforce_company_status_immutability:
-- 1. Rejected status can NEVER be changed again.
-- 2. Once accepted, status can NEVER be changed to rejected.
-- 3. Once advanced to 'email_drafted', 'pending_send_approval', 'sent', or 'replied',
--    status can NEVER be reset back to pending.
-- 4. An 'approved' company that fails during email generation CAN be rolled back to pending_review.

CREATE OR REPLACE FUNCTION enforce_company_status_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. If company is already rejected, its status can NEVER be changed again
    IF OLD.status = 'rejected'::company_status AND NEW.status <> 'rejected'::company_status THEN
        RAISE EXCEPTION 'Company has been rejected and its status cannot be changed again.';
    END IF;

    -- 2. Once accepted, it can NEVER be rejected
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
    END IF;

    -- 3. Once an email draft has been generated or advanced, it cannot be reset to pending
    IF OLD.status IN (
        'email_drafted'::company_status,
        'pending_send_approval'::company_status,
        'sent'::company_status,
        'replied'::company_status
    ) THEN
        IF NEW.status IN ('pending_review'::company_status, 'discovered'::company_status, 'enriched'::company_status) THEN
            RAISE EXCEPTION 'Company has already been processed and cannot be reset to pending.';
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
