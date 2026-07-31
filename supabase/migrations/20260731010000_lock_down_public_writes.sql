-- ═══════════════════════════════════════════════════════════════
-- LOCK DOWN PUBLIC WRITES
--
-- The original policies on these tables allowed anyone holding the
-- anon key to insert, update, and delete — and, for leads and
-- newsletter signups, to read them. Those tables hold names, email
-- addresses, company names, and budget ranges, so anonymous read and
-- delete were the two most urgent holes.
--
-- What stays public:
--   · reading gallery_items and portfolio_images (they render on the
--     public site)
--   · reading files in the portfolio storage bucket
--   · submitting a lead and joining the newsletter (anon INSERT)
--
-- Everything else now requires the owner allowlist established in
-- 20260731000000_zengen_gallery.sql.
-- ═══════════════════════════════════════════════════════════════

-- ── gallery_items ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can insert gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Anyone can update gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Anyone can delete gallery items" ON public.gallery_items;
-- "Gallery items are publicly readable" is intentionally kept.

CREATE POLICY "owner inserts gallery items"
  ON public.gallery_items FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "owner updates gallery items"
  ON public.gallery_items FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "owner deletes gallery items"
  ON public.gallery_items FOR DELETE TO authenticated USING (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.gallery_items FROM anon;

-- ── portfolio_images ───────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can insert portfolio images" ON public.portfolio_images;
DROP POLICY IF EXISTS "Anyone can update portfolio images" ON public.portfolio_images;
DROP POLICY IF EXISTS "Anyone can delete portfolio images" ON public.portfolio_images;
-- "Portfolio images are publicly readable" is intentionally kept.

CREATE POLICY "owner inserts portfolio images"
  ON public.portfolio_images FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "owner updates portfolio images"
  ON public.portfolio_images FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "owner deletes portfolio images"
  ON public.portfolio_images FOR DELETE TO authenticated USING (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.portfolio_images FROM anon;

-- ── leads (contains personal data) ─────────────────────────────
DROP POLICY IF EXISTS "Anyone can read leads"   ON public.leads;
DROP POLICY IF EXISTS "Anyone can update leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can delete leads" ON public.leads;
-- "Anyone can submit a lead" is intentionally kept: the contact form
-- posts as anon and must keep working.

CREATE POLICY "owner reads leads"
  ON public.leads FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "owner updates leads"
  ON public.leads FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "owner deletes leads"
  ON public.leads FOR DELETE TO authenticated USING (public.is_admin());

REVOKE SELECT, UPDATE, DELETE ON public.leads FROM anon;

-- ── newsletter_signups (contains email addresses) ──────────────
DROP POLICY IF EXISTS "Anyone can read newsletter signups" ON public.newsletter_signups;
-- "Anyone can sign up for newsletter" is intentionally kept.

CREATE POLICY "owner reads newsletter signups"
  ON public.newsletter_signups FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "owner deletes newsletter signups"
  ON public.newsletter_signups FOR DELETE TO authenticated USING (public.is_admin());

REVOKE SELECT, UPDATE, DELETE ON public.newsletter_signups FROM anon;

-- ── portfolio storage bucket ───────────────────────────────────
DROP POLICY IF EXISTS "Anyone can upload portfolio files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update portfolio files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete portfolio files" ON storage.objects;
-- "Portfolio files are publicly accessible" is intentionally kept.

CREATE POLICY "owner uploads portfolio files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolio' AND public.is_admin());
CREATE POLICY "owner updates portfolio files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'portfolio' AND public.is_admin())
  WITH CHECK (bucket_id = 'portfolio' AND public.is_admin());
CREATE POLICY "owner deletes portfolio files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'portfolio' AND public.is_admin());
