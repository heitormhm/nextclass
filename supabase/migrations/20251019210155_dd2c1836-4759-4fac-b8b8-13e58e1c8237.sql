-- Fix handle_new_user() to prevent privilege escalation
-- Users should not be able to set their own role during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- SECURITY FIX: Always default to 'student' role
  -- Ignore client-supplied role from raw_user_meta_data to prevent privilege escalation
  -- Admins can manually upgrade users to 'teacher' or 'admin' after account creation
  user_role := 'student';
  
  -- Insert into users table (without role column)
  INSERT INTO public.users (
    id,
    full_name,
    email,
    phone,
    university,
    city,
    course,
    period
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'university', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'course', 'Engenharia'),
    COALESCE(NEW.raw_user_meta_data->>'period', '')
  );
  
  -- Insert role into user_roles table with hardcoded 'student' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;