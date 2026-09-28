REVOKE ALL ON public.skills FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;

CREATE POLICY "members view organization skills" ON public.skills FOR SELECT TO authenticated
USING ((SELECT private.is_org_member(org_id)));

CREATE POLICY "members create their skills" ON public.skills FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT private.is_org_member(org_id)));

CREATE POLICY "owners update their skills" ON public.skills FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owners delete their skills" ON public.skills FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));
