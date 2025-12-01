-- Create enum for shift types
CREATE TYPE public.shift_type AS ENUM ('pagi', 'siang', 'full', 'libur');

-- Create barber_schedules table
CREATE TABLE public.barber_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
  schedule_date DATE NOT NULL,
  shift shift_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(barber_id, schedule_date)
);

-- Enable RLS on barber_schedules
ALTER TABLE public.barber_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for barber_schedules
-- All authenticated users can view schedules
CREATE POLICY "Authenticated users can view schedules"
ON public.barber_schedules FOR SELECT
TO authenticated
USING (true);

-- Only owners can insert schedules
CREATE POLICY "Owners can insert schedules"
ON public.barber_schedules FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Only owners can update schedules
CREATE POLICY "Owners can update schedules"
ON public.barber_schedules FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Only owners can delete schedules
CREATE POLICY "Owners can delete schedules"
ON public.barber_schedules FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_barber_schedules_updated_at
  BEFORE UPDATE ON public.barber_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON COLUMN public.barber_schedules.shift IS 'pagi: 09:45-14:00, siang: 14:00-19:00, full: 09:45-21:00, libur: hari libur';
COMMENT ON COLUMN public.barber_schedules.schedule_date IS 'Tanggal jadwal spesifik';

