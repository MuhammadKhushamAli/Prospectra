REVOKE ALL ON public.project_skills FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.project_skills TO authenticated;

CREATE POLICY "members view project skills" ON public.project_skills FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects project
        WHERE project.id = project_id
          AND (SELECT private.is_org_member(project.org_id))
    )
);

CREATE POLICY "project owners manage project skills" ON public.project_skills FOR ALL TO authenticated
USING ((SELECT private.owns_project(project_id)))
WITH CHECK ((SELECT private.owns_project(project_id)));
