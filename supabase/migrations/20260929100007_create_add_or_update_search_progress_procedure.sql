-- Procedure: Add or Update Search Progress
-- Inserts or updates the pagination tracking for an organization and skill target

CREATE OR REPLACE PROCEDURE public.add_or_update_search_progress(
    p_org_id UUID,
    p_skill_target_id UUID,
    p_last_page_fetched INT DEFAULT 0,
    p_last_fetched_at TIMESTAMPTZ DEFAULT now()
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.search_progress (
        org_id,
        skill_target_id,
        last_page_fetched,
        last_fetched_at
    )
    VALUES (
        p_org_id,
        p_skill_target_id,
        COALESCE(p_last_page_fetched, 0),
        COALESCE(p_last_fetched_at, now())
    )
    ON CONFLICT (org_id, skill_target_id) DO UPDATE SET
        last_page_fetched = EXCLUDED.last_page_fetched,
        last_fetched_at = EXCLUDED.last_fetched_at;
END;
$$;

REVOKE ALL ON PROCEDURE public.add_or_update_search_progress(UUID, UUID, INT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE public.add_or_update_search_progress(UUID, UUID, INT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON PROCEDURE public.add_or_update_search_progress(UUID, UUID, INT, TIMESTAMPTZ) TO service_role;
