REVOKE ALL ON public.sender_identities FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.sender_identities TO authenticated;

CREATE POLICY "founders and identity owners view sender identities" ON public.sender_identities FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR (SELECT private.is_org_founder(org_id)));

CREATE POLICY "founders add sender identities" ON public.sender_identities FOR INSERT TO authenticated
WITH CHECK ((SELECT private.is_org_founder(org_id)));

CREATE POLICY "founders delete sender identities" ON public.sender_identities FOR DELETE TO authenticated
USING ((SELECT private.is_org_founder(org_id)));
