DROP POLICY IF EXISTS "Admins can read all leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can read newsletter signups" ON public.newsletter_signups;

CREATE POLICY "Anyone can read leads" ON public.leads FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can update leads" ON public.leads FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete leads" ON public.leads FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Anyone can read newsletter signups" ON public.newsletter_signups FOR SELECT TO anon, authenticated USING (true);