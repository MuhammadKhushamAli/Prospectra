REVOKE ALL ON public.projects FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;

CREATE POLICY "members view organization projects" ON public.projects FOR SELECT TO authenticated
USING ((SELECT private.is_org_member(org_id)));

CREATE POLICY "members create their projects" ON public.projects FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT private.is_org_member(org_id)));

CREATE POLICY "owners update their projects" ON public.projects FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owners delete their projects" ON public.projects FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));
