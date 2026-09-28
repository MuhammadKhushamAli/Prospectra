REVOKE ALL ON public.emails FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.emails TO authenticated;

CREATE POLICY "users view sent or skill-matched emails" ON public.emails FOR SELECT TO authenticated
USING ((SELECT private.can_access_email(id)));

CREATE POLICY "senders and matched users update emails" ON public.emails FOR UPDATE TO authenticated
USING ((SELECT private.can_access_email(id)))
WITH CHECK ((SELECT private.can_access_email(id)));
