-- Function: Is User Part of Organization
-- Checks if a user is an active member or owner of a given organization

-- Checks specified user_id against specified org_id
CREATE OR REPLACE FUNCTION public.is_user_part_of_organization(
    p_user_id UUID,
    p_org_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE org_id = p_org_id
          AND user_id = p_user_id
    ) OR EXISTS (
        SELECT 1
        FROM public.organizations
        WHERE id = p_org_id
          AND owner_id = p_user_id
    );
$$;

-- Overload: Checks currently authenticated user (auth.uid()) against specified org_id
CREATE OR REPLACE FUNCTION public.is_user_part_of_organization(
    p_org_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT public.is_user_part_of_organization(auth.uid(), p_org_id);
$$;

REVOKE ALL ON FUNCTION public.is_user_part_of_organization(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_part_of_organization(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_part_of_organization(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.is_user_part_of_organization(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_part_of_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_part_of_organization(UUID) TO service_role;
