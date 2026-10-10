REVOKE ALL ON public.skills FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;

CREATE POLICY "members view organization skills" ON public.skills FOR SELECT TO authenticated
USING ((SELECT private.is_org_member(org_id)));

CREATE POLICY "members create their skills" ON public.skills FOR INSERT TO authenticated
WITH CHECK ((SELECT private.is_org_member(org_id)));

CREATE POLICY "owners update their skills" ON public.skills FOR UPDATE TO authenticated
USING (
    (SELECT private.owns_skill(id))
    AND (SELECT private.is_org_member(org_id))
)
WITH CHECK (
    (SELECT private.owns_skill(id))
    AND (SELECT private.is_org_member(org_id))
);

CREATE POLICY "owners delete their skills" ON public.skills FOR DELETE TO authenticated
USING (
    (SELECT private.owns_skill(id))
    AND (SELECT private.is_org_member(org_id))
);
