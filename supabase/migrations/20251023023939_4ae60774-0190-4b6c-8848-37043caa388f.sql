-- Update existing cashier roles to barber
UPDATE public.user_roles 
SET role = 'barber'
WHERE role = 'cashier';

-- Update the trigger function to use barber instead of cashier
CREATE OR REPLACE FUNCTION public.handle_cashier_as_barber()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If the role is barber, insert into barbers table
  IF NEW.role = 'barber' THEN
    INSERT INTO public.barbers (id, name)
    SELECT NEW.user_id, profiles.username
    FROM public.profiles
    WHERE profiles.id = NEW.user_id
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;