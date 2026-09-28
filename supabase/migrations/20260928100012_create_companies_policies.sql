REVOKE ALL ON public.companies FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.companies TO authenticated;

CREATE POLICY "users view companies matched to their skills" ON public.companies FOR SELECT TO authenticated
USING ((SELECT private.can_access_company(id)));

CREATE POLICY "matched users and founders update companies" ON public.companies FOR UPDATE TO authenticated
USING ((SELECT private.can_access_company(id)))
WITH CHECK ((SELECT private.can_access_company(id)));
