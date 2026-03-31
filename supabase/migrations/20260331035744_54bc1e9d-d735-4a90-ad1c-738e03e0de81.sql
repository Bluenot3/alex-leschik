
-- Create portfolio_images table to track cube face assignments
CREATE TABLE public.portfolio_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  face_index INTEGER NOT NULL CHECK (face_index >= 0 AND face_index <= 5),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(face_index)
);

-- Public read access (portfolio is public)
ALTER TABLE public.portfolio_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio images are publicly readable"
ON public.portfolio_images FOR SELECT USING (true);

CREATE POLICY "Anyone can insert portfolio images"
ON public.portfolio_images FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update portfolio images"
ON public.portfolio_images FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete portfolio images"
ON public.portfolio_images FOR DELETE USING (true);

-- Create public storage bucket for portfolio images
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio', 'portfolio', true);

CREATE POLICY "Portfolio files are publicly accessible"
ON storage.objects FOR SELECT USING (bucket_id = 'portfolio');

CREATE POLICY "Anyone can upload portfolio files"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'portfolio');

CREATE POLICY "Anyone can update portfolio files"
ON storage.objects FOR UPDATE USING (bucket_id = 'portfolio');

CREATE POLICY "Anyone can delete portfolio files"
ON storage.objects FOR DELETE USING (bucket_id = 'portfolio');
