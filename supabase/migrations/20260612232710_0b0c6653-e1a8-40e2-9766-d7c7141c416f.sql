CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  company text DEFAULT ''::text,
  project_type text DEFAULT ''::text,
  budget_range text DEFAULT ''::text,
  message text DEFAULT ''::text,
  status text NOT NULL DEFAULT 'new'::text,
  source text DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.newsletter_signups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT INSERT ON public.leads TO anon;
GRANT ALL ON public.leads TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_signups TO authenticated;
GRANT INSERT ON public.newsletter_signups TO anon;
GRANT ALL ON public.newsletter_signups TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read all leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update leads" ON public.leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete leads" ON public.leads FOR DELETE TO authenticated USING (true);

CREATE POLICY "Anyone can sign up for newsletter" ON public.newsletter_signups FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read newsletter signups" ON public.newsletter_signups FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();