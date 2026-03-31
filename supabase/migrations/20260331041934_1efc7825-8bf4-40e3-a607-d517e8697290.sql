
-- Gallery items table for images, videos, and code embeds
CREATE TABLE public.gallery_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'code')),
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  storage_path TEXT,
  external_url TEXT,
  code_content TEXT,
  code_language TEXT DEFAULT 'javascript',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Gallery items are publicly readable"
  ON public.gallery_items FOR SELECT TO public
  USING (true);

-- Public insert (temporary admin — will lock down later)
CREATE POLICY "Anyone can insert gallery items"
  ON public.gallery_items FOR INSERT TO public
  WITH CHECK (true);

-- Public update
CREATE POLICY "Anyone can update gallery items"
  ON public.gallery_items FOR UPDATE TO public
  USING (true);

-- Public delete
CREATE POLICY "Anyone can delete gallery items"
  ON public.gallery_items FOR DELETE TO public
  USING (true);
