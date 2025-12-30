-- Add is_active column to barbers table for soft delete
ALTER TABLE public.barbers ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Update RLS policy for barbers to only show active barbers for SELECT
DROP POLICY IF EXISTS "Authenticated users can view barbers" ON public.barbers;

CREATE POLICY "Authenticated users can view active barbers" 
ON public.barbers 
FOR SELECT 
USING (is_active = true);