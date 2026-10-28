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
    p_about_text TEXT DEFAULT NULL,
    p_need_hypothesis TEXT DEFAULT NULL,
    p_needed_skills TEXT[] DEFAULT '{}'::TEXT[],
    p_needed_services TEXT[] DEFAULT '{}'::TEXT[],
    p_need_signals TEXT[] DEFAULT '{}'::TEXT[],
    p_proposed_solution TEXT DEFAULT NULL,
    p_services_offered TEXT[] DEFAULT '{}'::TEXT[],
    p_digital_features TEXT[] DEFAULT '{}'::TEXT[],
    p_auth_score INT DEFAULT NULL,
    p_auth_feedback TEXT DEFAULT NULL,
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
        about_text,
        need_hypothesis,
        needed_skills,
        needed_services,
        need_signals,
        proposed_solution,
        services_offered,
        digital_features,
        auth_score,
        auth_feedback,
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
        p_about_text,
        p_need_hypothesis,
        COALESCE(p_needed_skills, '{}'::TEXT[]),
        COALESCE(p_needed_services, '{}'::TEXT[]),
        COALESCE(p_need_signals, '{}'::TEXT[]),
        p_proposed_solution,
        COALESCE(p_services_offered, '{}'::TEXT[]),
        COALESCE(p_digital_features, '{}'::TEXT[]),
        p_auth_score,
        p_auth_feedback,
        COALESCE(p_source, '{}'::TEXT[]),
        COALESCE(p_raw_signals, '{}'::jsonb),
        COALESCE(p_status, 'discovered'::company_status)
    )
    ON CONFLICT (org_id, domain) DO UPDATE SET
        name = EXCLUDED.name,
        website = COALESCE(EXCLUDED.website, public.companies.website),
        linkedin_url = COALESCE(EXCLUDED.linkedin_url, public.companies.linkedin_url),
        industry = COALESCE(EXCLUDED.industry, public.companies.industry),
        size = COALESCE(EXCLUDED.size, public.companies.size),
        about_text = COALESCE(EXCLUDED.about_text, public.companies.about_text),
        need_hypothesis = COALESCE(EXCLUDED.need_hypothesis, public.companies.need_hypothesis),
        needed_skills = CASE WHEN EXCLUDED.needed_skills <> '{}'::TEXT[] THEN EXCLUDED.needed_skills ELSE public.companies.needed_skills END,
        needed_services = CASE WHEN EXCLUDED.needed_services <> '{}'::TEXT[] THEN EXCLUDED.needed_services ELSE public.companies.needed_services END,
        need_signals = CASE WHEN EXCLUDED.need_signals <> '{}'::TEXT[] THEN EXCLUDED.need_signals ELSE public.companies.need_signals END,
        proposed_solution = COALESCE(EXCLUDED.proposed_solution, public.companies.proposed_solution),
        services_offered = CASE WHEN EXCLUDED.services_offered <> '{}'::TEXT[] THEN EXCLUDED.services_offered ELSE public.companies.services_offered END,
        digital_features = CASE WHEN EXCLUDED.digital_features <> '{}'::TEXT[] THEN EXCLUDED.digital_features ELSE public.companies.digital_features END,
        auth_score = COALESCE(EXCLUDED.auth_score, public.companies.auth_score),
        auth_feedback = COALESCE(EXCLUDED.auth_feedback, public.companies.auth_feedback),
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
    v_skills_arr TEXT[];
    v_services_arr TEXT[];
    v_signals_arr TEXT[];
    v_offered_arr TEXT[];
    v_features_arr TEXT[];
BEGIN
    p_inserted_count := 0;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_companies)
    LOOP
        IF v_item ? 'source' AND jsonb_typeof(v_item->'source') = 'array' THEN
            SELECT ARRAY(SELECT jsonb_array_elements_text(v_item->'source')) INTO v_source_arr;
        ELSE
            v_source_arr := '{}'::TEXT[];
        END IF;

        IF v_item ? 'needed_skills' AND jsonb_typeof(v_item->'needed_skills') = 'array' THEN
            SELECT ARRAY(SELECT jsonb_array_elements_text(v_item->'needed_skills')) INTO v_skills_arr;
        ELSE
            v_skills_arr := '{}'::TEXT[];
        END IF;

        IF v_item ? 'needed_services' AND jsonb_typeof(v_item->'needed_services') = 'array' THEN
            SELECT ARRAY(SELECT jsonb_array_elements_text(v_item->'needed_services')) INTO v_services_arr;
        ELSE
            v_services_arr := '{}'::TEXT[];
        END IF;

        IF v_item ? 'need_signals' AND jsonb_typeof(v_item->'need_signals') = 'array' THEN
            SELECT ARRAY(SELECT jsonb_array_elements_text(v_item->'need_signals')) INTO v_signals_arr;
        ELSE
            v_signals_arr := '{}'::TEXT[];
        END IF;

        IF v_item ? 'services_offered' AND jsonb_typeof(v_item->'services_offered') = 'array' THEN
            SELECT ARRAY(SELECT jsonb_array_elements_text(v_item->'services_offered')) INTO v_offered_arr;
        ELSE
            v_offered_arr := '{}'::TEXT[];
        END IF;

        IF v_item ? 'digital_features' AND jsonb_typeof(v_item->'digital_features') = 'array' THEN
            SELECT ARRAY(SELECT jsonb_array_elements_text(v_item->'digital_features')) INTO v_features_arr;
        ELSE
            v_features_arr := '{}'::TEXT[];
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
            v_item->>'about_text',
            v_item->>'need_hypothesis',
            v_skills_arr,
            v_services_arr,
            v_signals_arr,
            v_item->>'proposed_solution',
            v_offered_arr,
            v_features_arr,
            (v_item->>'auth_score')::INT,
            v_item->>'auth_feedback',
            v_company_id
        );
        p_inserted_count := p_inserted_count + 1;
    END LOOP;
END;
$$;

REVOKE ALL ON PROCEDURE public.add_company(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], JSONB, company_status, TEXT, TEXT, TEXT[], TEXT[], TEXT[], TEXT, TEXT[], TEXT[], INT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE public.add_company(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], JSONB, company_status, TEXT, TEXT, TEXT[], TEXT[], TEXT[], TEXT, TEXT[], TEXT[], INT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON PROCEDURE public.add_company(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], JSONB, company_status, TEXT, TEXT, TEXT[], TEXT[], TEXT[], TEXT, TEXT[], TEXT[], INT, TEXT, UUID) TO service_role;

REVOKE ALL ON PROCEDURE public.add_companies(JSONB, INT) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE public.add_companies(JSONB, INT) TO authenticated;
GRANT EXECUTE ON PROCEDURE public.add_companies(JSONB, INT) TO service_role;
