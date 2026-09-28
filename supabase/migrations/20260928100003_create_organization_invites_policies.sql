REVOKE ALL ON public.organization_invites FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invites TO authenticated;

CREATE POLICY "founders manage organization invites" ON public.organization_invites FOR ALL TO authenticated
USING ((SELECT private.is_org_founder(org_id)))
WITH CHECK ((SELECT private.is_org_founder(org_id)));
