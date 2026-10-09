CREATE TABLE public.user_roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role = 'admin'),
 UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
INSERT INTO public.user_roles (user_id, role) SELECT id, 'admin' FROM auth.users WHERE lower(email) = 'royaltokens@gmail.com' AND email_confirmed_at IS NOT NULL ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'); $$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

DROP POLICY "Anyone can delete gallery items" ON public.gallery_items;
DROP POLICY "Anyone can update gallery items" ON public.gallery_items;
DROP POLICY "Anyone can insert gallery items" ON public.gallery_items;
CREATE POLICY "Owner manages gallery" ON public.gallery_items FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY "Anyone can delete portfolio images" ON public.portfolio_images;
DROP POLICY "Anyone can update portfolio images" ON public.portfolio_images;
DROP POLICY "Anyone can insert portfolio images" ON public.portfolio_images;
CREATE POLICY "Owner manages portfolio images" ON public.portfolio_images FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.gallery_items, public.portfolio_images FROM anon;
GRANT SELECT ON public.gallery_items, public.portfolio_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_items, public.portfolio_images TO authenticated;
GRANT ALL ON public.gallery_items, public.portfolio_images TO service_role;

DROP POLICY "Anyone can delete leads" ON public.leads;
DROP POLICY "Anyone can update leads" ON public.leads;
DROP POLICY "Anyone can read leads" ON public.leads;
CREATE POLICY "Owner manages leads" ON public.leads FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY "Anyone can read newsletter signups" ON public.newsletter_signups;
CREATE POLICY "Owner reads newsletter signups" ON public.newsletter_signups FOR SELECT TO authenticated USING (public.is_admin());
REVOKE SELECT, UPDATE, DELETE ON public.leads, public.newsletter_signups FROM anon;
GRANT INSERT ON public.leads, public.newsletter_signups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT ON public.newsletter_signups TO authenticated;
GRANT ALL ON public.leads, public.newsletter_signups TO service_role;

DROP POLICY "Anyone can delete portfolio files" ON storage.objects;
DROP POLICY "Anyone can update portfolio files" ON storage.objects;
DROP POLICY "Anyone can upload portfolio files" ON storage.objects;
CREATE POLICY "Owner uploads portfolio files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portfolio' AND public.is_admin());
CREATE POLICY "Owner updates portfolio files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'portfolio' AND public.is_admin()) WITH CHECK (bucket_id = 'portfolio' AND public.is_admin());
CREATE POLICY "Owner deletes portfolio files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'portfolio' AND public.is_admin());

DROP POLICY "Anyone can record a play" ON public.game_plays;
REVOKE ALL ON public.game_plays FROM anon, authenticated;
GRANT ALL ON public.game_plays, public.daily_puzzles TO service_role;