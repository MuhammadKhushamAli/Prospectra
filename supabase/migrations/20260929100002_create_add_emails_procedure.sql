-- Procedure: Add Email / Add Emails
-- Adds a single email or a batch of emails into public.emails table

CREATE OR REPLACE PROCEDURE public.add_email(
    p_company_id UUID,
    p_body TEXT,
    p_subject TEXT DEFAULT NULL,
    p_contact_id UUID DEFAULT NULL,
    p_project_id UUID DEFAULT NULL,
    p_sent_by_user_id UUID DEFAULT NULL,
    p_sender_identity_id UUID DEFAULT NULL,
    p_status email_status DEFAULT 'draft'::email_status,
    p_sent_at TIMESTAMPTZ DEFAULT NULL,
    INOUT p_email_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.emails (
        company_id,
        body,
        subject,
        contact_id,
        project_id,
        sent_by_user_id,
        sender_identity_id,
        status,
        sent_at
    )
    VALUES (
        p_company_id,
        p_body,
        p_subject,
        p_contact_id,
        p_project_id,
        p_sent_by_user_id,
        p_sender_identity_id,
        COALESCE(p_status, 'draft'::email_status),
        p_sent_at
    )
    RETURNING id INTO p_email_id;
END;
$$;

-- Procedure for batch inserting emails from a JSONB array
CREATE OR REPLACE PROCEDURE public.add_emails(
    p_emails JSONB,
    INOUT p_inserted_count INT DEFAULT 0
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item JSONB;
    v_email_id UUID;
BEGIN
    p_inserted_count := 0;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_emails)
    LOOP
        CALL public.add_email(
            (v_item->>'company_id')::UUID,
            v_item->>'body',
            v_item->>'subject',
            (v_item->>'contact_id')::UUID,
            (v_item->>'project_id')::UUID,
            (v_item->>'sent_by_user_id')::UUID,
            (v_item->>'sender_identity_id')::UUID,
            COALESCE((v_item->>'status')::email_status, 'draft'::email_status),
            (v_item->>'sent_at')::TIMESTAMPTZ,
            v_email_id
        );
        p_inserted_count := p_inserted_count + 1;
    END LOOP;
END;
$$;

REVOKE ALL ON PROCEDURE public.add_email(UUID, TEXT, TEXT, UUID, UUID, UUID, UUID, email_status, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE public.add_email(UUID, TEXT, TEXT, UUID, UUID, UUID, UUID, email_status, TIMESTAMPTZ, UUID) TO authenticated;
GRANT EXECUTE ON PROCEDURE public.add_email(UUID, TEXT, TEXT, UUID, UUID, UUID, UUID, email_status, TIMESTAMPTZ, UUID) TO service_role;

REVOKE ALL ON PROCEDURE public.add_emails(JSONB, INT) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE public.add_emails(JSONB, INT) TO authenticated;
GRANT EXECUTE ON PROCEDURE public.add_emails(JSONB, INT) TO service_role;
