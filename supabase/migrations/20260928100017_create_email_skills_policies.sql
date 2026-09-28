REVOKE ALL ON public.email_skills FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.email_skills TO authenticated;

CREATE POLICY "users view skills for accessible emails" ON public.email_skills FOR SELECT TO authenticated
USING ((SELECT private.can_access_email(email_id)));

CREATE POLICY "users manage skills for accessible emails" ON public.email_skills FOR ALL TO authenticated
USING ((SELECT private.can_access_email(email_id)))
WITH CHECK ((SELECT private.can_access_email(email_id)));
