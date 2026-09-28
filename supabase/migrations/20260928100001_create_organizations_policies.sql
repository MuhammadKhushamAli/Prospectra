REVOKE ALL ON public.organizations FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;

CREATE POLICY "members can view their organizations" ON public.organizations FOR SELECT TO authenticated
USING ((SELECT private.is_org_member(id)));

CREATE POLICY "users can create organizations they own" ON public.organizations FOR INSERT TO authenticated
WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "founders can update organizations" ON public.organizations FOR UPDATE TO authenticated
USING ((SELECT private.is_org_founder(id))) WITH CHECK ((SELECT private.is_org_founder(id)));

CREATE POLICY "founders can delete organizations" ON public.organizations FOR DELETE TO authenticated
USING ((SELECT private.is_org_founder(id)));
