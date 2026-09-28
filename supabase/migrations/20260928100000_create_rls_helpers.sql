CREATE SCHEMA IF NOT EXISTS private;

CREATE FUNCTION private.is_org_member(check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members membership
        WHERE membership.org_id = check_org_id
          AND membership.user_id = (SELECT auth.uid())
    );
$$;

CREATE FUNCTION private.is_org_founder(check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members membership
        WHERE membership.org_id = check_org_id
          AND membership.user_id = (SELECT auth.uid())
          AND membership.role = 'founder'
    );
$$;

CREATE FUNCTION private.owns_skill(check_skill_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.skills skill
        WHERE skill.id = check_skill_id
          AND skill.user_id = (SELECT auth.uid())
    );
$$;

CREATE FUNCTION private.owns_project(check_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.projects project
        WHERE project.id = check_project_id
          AND project.user_id = (SELECT auth.uid())
    );
$$;

CREATE FUNCTION private.can_access_company(check_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.companies company
        WHERE company.id = check_company_id
          AND (
              private.is_org_founder(company.org_id)
              OR EXISTS (
                  SELECT 1
                  FROM public.company_skills company_skill
                  JOIN public.skills skill ON skill.id = company_skill.skill_id
                  WHERE company_skill.company_id = company.id
                    AND skill.org_id = company.org_id
                    AND skill.user_id = (SELECT auth.uid())
              )
          )
    );
$$;

CREATE FUNCTION private.can_access_email(check_email_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.emails email
        WHERE email.id = check_email_id
        AND (
            email.sent_by_user_id = (SELECT auth.uid())
            OR private.is_org_founder(email.company_id)
        )
    );
$$;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
REVOKE ALL ON FUNCTION private.is_org_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_org_founder(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.owns_skill(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.owns_project(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_company(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_email(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_org_founder(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.owns_skill(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.owns_project(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_email(UUID) TO authenticated;
