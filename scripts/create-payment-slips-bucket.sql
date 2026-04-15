-- Create storage bucket for payment slips
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-slips', 'payment-slips', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for payment slips
CREATE POLICY "Allow authenticated users to upload payment slips"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-slips');

CREATE POLICY "Allow public to view payment slips"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-slips');

CREATE POLICY "Allow users to delete their own payment slips"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-slips');
