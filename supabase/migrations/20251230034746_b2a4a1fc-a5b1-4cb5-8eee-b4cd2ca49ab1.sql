-- Drop existing foreign key constraints and recreate with ON DELETE CASCADE

-- 1. Transactions table - barber_id foreign key
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_barber_id_fkey;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_barber_id_fkey 
FOREIGN KEY (barber_id) REFERENCES public.barbers(id) ON DELETE CASCADE;

-- 2. Salary records table - barber_id foreign key
ALTER TABLE public.salary_records 
DROP CONSTRAINT IF EXISTS salary_records_barber_id_fkey;

ALTER TABLE public.salary_records 
ADD CONSTRAINT salary_records_barber_id_fkey 
FOREIGN KEY (barber_id) REFERENCES public.barbers(id) ON DELETE CASCADE;

-- 3. Barber schedules table - barber_id foreign key
ALTER TABLE public.barber_schedules 
DROP CONSTRAINT IF EXISTS barber_schedules_barber_id_fkey;

ALTER TABLE public.barber_schedules 
ADD CONSTRAINT barber_schedules_barber_id_fkey 
FOREIGN KEY (barber_id) REFERENCES public.barbers(id) ON DELETE CASCADE;