-- Allow teacher role signup with validation requirement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  needs_validation boolean;
BEGIN
  -- Read role from metadata, default to 'student'
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student');
  
  -- SECURITY: Block 'admin' role from client signup (privilege escalation prevention)
  IF user_role = 'admin' THEN
    user_role := 'student';
  END IF;
  
  -- Determine if validation is needed
  needs_validation := (user_role = 'teacher');
  
  -- Insert into users table
  INSERT INTO public.users (
    id, full_name, email, phone, university, city, course, period
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'university', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'course', 'Engenharia'),
    COALESCE(NEW.raw_user_meta_data->>'period', '')
  );
  
  -- Insert role with validation flag
  INSERT INTO public.user_roles (user_id, role, is_validated)
  VALUES (NEW.id, user_role, NOT needs_validation);
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS 
'Handles new user signup. Students get immediate access (is_validated=true). Teachers require validation via access code (is_validated=false). Admin role blocked from client signup.';