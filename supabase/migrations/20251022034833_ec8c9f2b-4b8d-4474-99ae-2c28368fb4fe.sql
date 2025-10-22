-- Drop and recreate primary key with CASCADE to handle foreign key dependencies
ALTER TABLE public.barbers DROP CONSTRAINT IF EXISTS barbers_pkey CASCADE;
ALTER TABLE public.barbers ADD CONSTRAINT barbers_pkey PRIMARY KEY (id);

-- Recreate foreign key constraints that were dropped
ALTER TABLE public.transactions 
  DROP CONSTRAINT IF EXISTS transactions_barber_id_fkey,
  ADD CONSTRAINT transactions_barber_id_fkey 
  FOREIGN KEY (barber_id) REFERENCES public.barbers(id);

ALTER TABLE public.salary_records 
  DROP CONSTRAINT IF EXISTS salary_records_barber_id_fkey,
  ADD CONSTRAINT salary_records_barber_id_fkey 
  FOREIGN KEY (barber_id) REFERENCES public.barbers(id);

-- Create trigger function to automatically add cashier to barbers table
CREATE OR REPLACE FUNCTION public.handle_cashier_as_barber()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the role is cashier, insert into barbers table
  IF NEW.role = 'cashier' THEN
    INSERT INTO public.barbers (id, name)
    SELECT NEW.user_id, profiles.username
    FROM public.profiles
    WHERE profiles.id = NEW.user_id
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on user_roles table
DROP TRIGGER IF EXISTS on_cashier_role_added ON public.user_roles;
CREATE TRIGGER on_cashier_role_added
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_cashier_as_barber();