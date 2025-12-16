-- Create barber_schedules table
CREATE TABLE public.barber_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('pagi', 'siang', 'full', 'libur')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (barber_id, schedule_date)
);

-- Enable RLS
ALTER TABLE public.barber_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view schedules"
ON public.barber_schedules
FOR SELECT
USING (true);

CREATE POLICY "Owners can manage schedules"
ON public.barber_schedules
FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role));