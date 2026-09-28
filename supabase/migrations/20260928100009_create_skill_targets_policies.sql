REVOKE ALL ON public.skill_targets FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skill_targets TO authenticated;

CREATE POLICY "members view organization skill targets" ON public.skill_targets FOR SELECT TO authenticated
USING ((SELECT private.is_org_member(org_id)));

CREATE POLICY "founders manage skill targets" ON public.skill_targets FOR ALL TO authenticated
USING ((SELECT private.is_org_founder(org_id)))
WITH CHECK ((SELECT private.is_org_founder(org_id)));
