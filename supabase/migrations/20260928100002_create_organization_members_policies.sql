REVOKE ALL ON public.organization_members FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;

CREATE POLICY "members can view organization membership" ON public.organization_members FOR SELECT TO authenticated
USING ((SELECT private.is_org_member(org_id)));
CREATE POLICY "founders can add members" ON public.organization_members FOR INSERT TO authenticated
WITH CHECK (
    (SELECT private.is_org_founder(org_id))
    OR (
        user_id = (SELECT auth.uid())
        AND role = 'founder'
        AND EXISTS (
            SELECT 1 FROM public.organizations organization
            WHERE organization.id = org_id AND organization.owner_id = (SELECT auth.uid())
        )
    )
);

CREATE POLICY "founders can update member roles" ON public.organization_members FOR UPDATE TO authenticated
USING ((SELECT private.is_org_founder(org_id)))
WITH CHECK ((SELECT private.is_org_founder(org_id)));

CREATE POLICY "founders can remove members" ON public.organization_members FOR DELETE TO authenticated
USING ((SELECT private.is_org_founder(org_id)));
