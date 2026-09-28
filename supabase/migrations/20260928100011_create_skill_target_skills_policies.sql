REVOKE ALL ON public.skill_target_skills FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.skill_target_skills TO authenticated;

CREATE POLICY "members view skill target skills" ON public.skill_target_skills FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.skill_targets target
        WHERE target.id = skill_target_id
          AND (SELECT private.is_org_member(target.org_id))
    )
);

CREATE POLICY "founders manage skill target skills" ON public.skill_target_skills FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.skill_targets target
        WHERE target.id = skill_target_id
          AND (SELECT private.is_org_founder(target.org_id))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.skill_targets target
        WHERE target.id = skill_target_id
          AND (SELECT private.is_org_founder(target.org_id))
    )
);
