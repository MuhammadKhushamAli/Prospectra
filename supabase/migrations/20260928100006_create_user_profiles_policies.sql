REVOKE ALL ON public.user_profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;

CREATE POLICY "users and founders view organization profiles" ON public.user_profiles FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR (SELECT private.is_org_founder(org_id)));

CREATE POLICY "users create their organization profiles" ON public.user_profiles FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "users update their organization profiles" ON public.user_profiles FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "founders delete organization profiles" ON public.user_profiles FOR DELETE TO authenticated
USING ((SELECT private.is_org_founder(org_id)));
