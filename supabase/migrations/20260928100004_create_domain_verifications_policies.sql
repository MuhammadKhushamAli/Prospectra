REVOKE ALL ON public.domain_verifications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.domain_verifications TO authenticated;

CREATE POLICY "founders manage domain verifications" ON public.domain_verifications FOR ALL TO authenticated
USING ((SELECT private.is_org_founder(org_id)))
WITH CHECK ((SELECT private.is_org_founder(org_id)));
