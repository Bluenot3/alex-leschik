-- ═══════════════════════════════════════════════════════════════
-- ZEN-GEN SETUP — run this once in the Supabase SQL editor.
--
-- Combines both migrations. Safe to re-run: every statement is
-- guarded with IF NOT EXISTS / IF EXISTS or ON CONFLICT.
--
-- AFTER running this, create the owner account:
--   Supabase dashboard -> Authentication -> Users -> Add user
--   Email:    royaltokens@gmail.com
--   Password: 317593        (this is the studio PIN)
--   Tick "Auto Confirm User" so no email step is needed.
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- ZEN-GEN GALLERY
-- Owner-only image library: public can read, only the owner writes.
--
-- Authorization is keyed on the signed-in user's verified email
-- matching public.admin_emails. That table carries no RLS policies,
-- so it is unreachable through the anon/authenticated API — it can
-- only be changed from the SQL editor or with the service role key.
-- ═══════════════════════════════════════════════════════════════

-- ── Owner allowlist ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_emails (
  email text PRIMARY KEY,
  note  text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: no API access at all.

-- Seed the owner. Change this address (or add rows) from the SQL editor.
INSERT INTO public.admin_emails (email, note)
VALUES ('royaltokens@gmail.com', 'site owner')
ON CONFLICT (email) DO NOTHING;

-- Reads the email out of the verified JWT, not from client input.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ── Collections ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.zengen_collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  title       text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  accent      text NOT NULL DEFAULT 'cyan',
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Images ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.zengen_images (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path  text NOT NULL,
  thumb_path    text,
  title         text NOT NULL DEFAULT '',
  prompt        text NOT NULL DEFAULT '',
  model         text NOT NULL DEFAULT '',
  collection_id uuid REFERENCES public.zengen_collections(id) ON DELETE SET NULL,
  width         integer,
  height        integer,
  bytes         integer,
  featured      boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Keyset pagination over thousands of rows leans on these.
CREATE INDEX IF NOT EXISTS zengen_images_created_idx
  ON public.zengen_images (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS zengen_images_collection_idx
  ON public.zengen_images (collection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS zengen_images_featured_idx
  ON public.zengen_images (featured) WHERE featured;

ALTER TABLE public.zengen_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zengen_images      ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.zengen_collections, public.zengen_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.zengen_collections, public.zengen_images TO authenticated;

-- Anyone may look; only the owner may write.
CREATE POLICY "zengen collections are public"
  ON public.zengen_collections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner writes collections"
  ON public.zengen_collections FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "owner edits collections"
  ON public.zengen_collections FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "owner removes collections"
  ON public.zengen_collections FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "zengen images are public"
  ON public.zengen_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner writes images"
  ON public.zengen_images FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "owner edits images"
  ON public.zengen_images FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "owner removes images"
  ON public.zengen_images FOR DELETE TO authenticated USING (public.is_admin());

-- ── Storage bucket ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'zen-gen', 'zen-gen', true, 26214400,
  ARRAY['image/jpeg','image/png','image/webp','image/avif','image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "zen-gen files are public"  ON storage.objects;
DROP POLICY IF EXISTS "owner uploads zen-gen"     ON storage.objects;
DROP POLICY IF EXISTS "owner replaces zen-gen"    ON storage.objects;
DROP POLICY IF EXISTS "owner deletes zen-gen"     ON storage.objects;

CREATE POLICY "zen-gen files are public"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'zen-gen');
CREATE POLICY "owner uploads zen-gen"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'zen-gen' AND public.is_admin());
CREATE POLICY "owner replaces zen-gen"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'zen-gen' AND public.is_admin())
  WITH CHECK (bucket_id = 'zen-gen' AND public.is_admin());
CREATE POLICY "owner deletes zen-gen"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'zen-gen' AND public.is_admin());

-- ── Starter collections ────────────────────────────────────────
INSERT INTO public.zengen_collections (slug, title, description, accent, sort_order) VALUES
  ('genesis',   'GENESIS',   'First generations — where the system found its voice', 'cyan',   0),
  ('artifacts', 'ARTIFACTS', 'Objects, sigils, and impossible geometry',             'violet', 1),
  ('worlds',    'WORLDS',    'Environments, cities, and spatial studies',            'amber',  2)
ON CONFLICT (slug) DO NOTHING;


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
