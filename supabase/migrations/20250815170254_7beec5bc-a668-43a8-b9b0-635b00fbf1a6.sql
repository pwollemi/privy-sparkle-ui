-- Fix the function search path security issue
DROP FUNCTION IF EXISTS public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$ LANGUAGE plpgsql 
SET search_path TO 'public';