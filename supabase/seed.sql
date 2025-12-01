-- ============================================
-- SEED DATA untuk Development
-- ============================================

-- Insert sample barbers
INSERT INTO public.barbers (id, name, created_at) VALUES
  ('aaaaaaaa-1111-1111-1111-111111111111', 'Abdi', NOW()),
  ('bbbbbbbb-2222-2222-2222-222222222222', 'Edwin', NOW()),
  ('cccccccc-3333-3333-3333-333333333333', 'Guns', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample services
INSERT INTO public.services (service_name, price, created_at) VALUES
  ('Potong Rambut Reguler', 35000, NOW()),
  ('Potong Rambut + Keramas', 45000, NOW()),
  ('Cukur Kumis & Jenggot', 15000, NOW()),
  ('Facial Treatment', 50000, NOW()),
  ('Hair Coloring', 150000, NOW())
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO public.products (product_name, price, created_at) VALUES
  ('Pomade Murray''s', 50000, NOW()),
  ('Hair Tonic', 30000, NOW()),
  ('Shampoo Anti Ketombe', 25000, NOW()),
  ('Wax Styling', 45000, NOW()),
  ('Hair Spray', 35000, NOW())
ON CONFLICT DO NOTHING;

-- Informasi
SELECT 'Seed data berhasil di-insert!' as status;
SELECT COUNT(*) as total_barbers FROM public.barbers;
SELECT COUNT(*) as total_services FROM public.services;
SELECT COUNT(*) as total_products FROM public.products;

