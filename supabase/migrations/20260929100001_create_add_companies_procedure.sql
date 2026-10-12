-- Procedure: Add Company / Add Companies
-- Adds a single company or a batch of companies into public.companies table

CREATE OR REPLACE PROCEDURE public.add_company(
    p_org_id UUID,
    p_name TEXT,
    p_domain TEXT DEFAULT NULL,
    p_website TEXT DEFAULT NULL,
    p_linkedin_url TEXT DEFAULT NULL,
    p_industry TEXT DEFAULT NULL,
    p_size TEXT DEFAULT NULL,
    p_source TEXT[] DEFAULT '{}'::TEXT[],
    p_raw_signals JSONB DEFAULT '{}'::jsonb,
    p_status company_status DEFAULT 'discovered'::company_status,
    INOUT p_company_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.companies (
        org_id,
        name,
        domain,
        website,
        linkedin_url,
        industry,
        size,
        source,
        raw_signals,
        status
    )
    VALUES (
        p_org_id,
        p_name,
        p_domain,
        p_website,
        p_linkedin_url,
        p_industry,
        p_size,
        COALESCE(p_source, '{}'::TEXT[]),
        COALESCE(p_raw_signals, '{}'::jsonb),
        COALESCE(p_status, 'discovered'::company_status)
    )
    ON CONFLICT (org_id, domain) DO UPDATE SET
        name = EXCLUDED.name,
        website = COALESCE(EXCLUDED.website, public.companies.website),
        linkedin_url = COALESCE(EXCLUDED.linkedin_url, public.companieslinkedin_url),
        industry = COALESCE(EXCLUDED.industry, public.companies.industry),
        size = COALESCE(EXCLUDED.size, public.companies.size),
        source = array_cat(public.companies.source, EXCLUDED.source),
        raw_signals = public.companies.raw_signals || EXCLUDED.raw_signals,
        status = EXCLUDED.status
    RETURNING id INTO p_company_id;
END;
$$;

-- Procedure for batch inserting companies from a JSONB array
CREATE OR REPLACE PROCEDURE public.add_companies(
    p_companies JSONB,
    INOUT p_inserted_count INT DEFAULT 0
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item JSONB;
    v_company_id UUID;
    v_source_arr TEXT[];
BEGIN
    p_inserted_count := 0;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_companies)
    LOOP
        IF v_item ? 'source' AND jsonb_typeof(v_item->'source') = 'array' THEN
            SELECT ARRAY(SELECT jsonb_array_elements_text(v_item->'source')) INTO v_source_arr;
        ELSE
            v_source_arr := '{}'::TEXT[];
        END IF;

        CALL public.add_company(
            (v_item->>'org_id')::UUID,
            v_item->>'name',
            v_item->>'domain',
            v_item->>'website',
            v_item->>'linkedin_url',
            v_item->>'industry',
            v_item->>'size',
            v_source_arr,
            COALESCE(v_item->'raw_signals', '{}'::jsonb),
            COALESCE((v_item->>'status')::company_status, 'discovered'::company_status),
            v_company_id
        );
        p_inserted_count := p_inserted_count + 1;
    END LOOP;
END;
$$;

REVOKE ALL ON PROCEDURE public.add_company(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], JSONB, company_status, UUID) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE public.add_company(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], JSONB, company_status, UUID) TO authenticated;
GRANT EXECUTE ON PROCEDURE public.add_company(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], JSONB, company_status, UUID) TO service_role;

REVOKE ALL ON PROCEDURE public.add_companies(JSONB, INT) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE public.add_companies(JSONB, INT) TO authenticated;
GRANT EXECUTE ON PROCEDURE public.add_companies(JSONB, INT) TO service_role;
