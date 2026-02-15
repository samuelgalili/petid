
-- Update handle_new_user to save more profile data from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_phone text;
  v_birthdate date;
  v_avatar_url text;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name');
  v_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone');
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  
  -- Split full_name into first/last
  IF v_full_name IS NOT NULL AND v_full_name != '' THEN
    v_first_name := split_part(v_full_name, ' ', 1);
    v_last_name := CASE 
      WHEN position(' ' in v_full_name) > 0 
      THEN substring(v_full_name from position(' ' in v_full_name) + 1)
      ELSE NULL 
    END;
  END IF;

  -- Parse birthdate if provided
  BEGIN
    v_birthdate := (NEW.raw_user_meta_data->>'birthdate')::date;
  EXCEPTION WHEN OTHERS THEN
    v_birthdate := NULL;
  END;

  INSERT INTO public.profiles (id, email, full_name, first_name, last_name, phone, birthdate, avatar_url)
  VALUES (
    NEW.id, 
    NEW.email, 
    v_full_name,
    v_first_name,
    v_last_name,
    v_phone,
    v_birthdate,
    v_avatar_url
  );
  RETURN NEW;
END;
$function$;
