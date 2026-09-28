REVOKE ALL ON public.company_skills FROM anon, authenticated;
GRANT SELECT ON public.company_skills TO authenticated;

CREATE POLICY "users view skills for accessible companies" ON public.company_skills FOR SELECT TO authenticated
USING ((SELECT private.can_access_company(company_id)));
