DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
CREATE POLICY "Anyone can submit a valid lead" ON public.leads FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(btrim(name)) BETWEEN 1 AND 200
  AND char_length(email) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND char_length(coalesce(company,'')) <= 200
  AND char_length(coalesce(project_type,'')) <= 200
  AND char_length(coalesce(budget_range,'')) <= 200
  AND char_length(coalesce(message,'')) <= 5000
  AND char_length(coalesce(source,'')) <= 200
  AND status = 'new'
);
DROP POLICY IF EXISTS "Anyone can sign up for newsletter" ON public.newsletter_signups;
CREATE POLICY "Anyone can sign up with a valid email" ON public.newsletter_signups FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(email) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);