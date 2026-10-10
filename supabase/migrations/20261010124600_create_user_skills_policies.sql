REVOKE ALL ON public.user_skills FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_skills TO authenticated;

CREATE POLICY "users and founders view user skills" ON public.user_skills FOR SELECT TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1
        FROM public.skills skill
        WHERE skill.id = skill_id
          AND (SELECT private.is_org_founder(skill.org_id))
    )
);

CREATE POLICY "users add their organization skills" ON public.user_skills FOR INSERT TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
        SELECT 1
        FROM public.skills skill
        WHERE skill.id = skill_id
          AND (SELECT private.is_org_member(skill.org_id))
    )
);

CREATE POLICY "users and founders remove user skills" ON public.user_skills FOR DELETE TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1
        FROM public.skills skill
        WHERE skill.id = skill_id
          AND (SELECT private.is_org_founder(skill.org_id))
    )
);
