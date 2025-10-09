-- Phase 1: Critical Security Fixes (Fixed)

-- 1. Drop the UPDATE policy on users table that depends on role column
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- 2. Remove the sync_user_role trigger (no longer needed)
DROP TRIGGER IF EXISTS sync_user_role_trigger ON public.user_roles;

-- 3. Remove role column from users table (roles should ONLY be in user_roles)
ALTER TABLE public.users DROP COLUMN IF EXISTS role CASCADE;

-- 4. Recreate UPDATE policy without role check (role is now in separate table)
CREATE POLICY "Users can update their own profile" 
ON public.users
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Ensure user_roles has proper RLS (users can only view, not modify)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" 
ON public.user_roles
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 6. Explicitly ensure NO INSERT/UPDATE/DELETE policies on user_roles
-- This prevents privilege escalation - only service role can modify roles
-- (No policies needed - absence of policy = denial by default)

-- 7. Update handle_new_user function to NOT set role in users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
BEGIN
  -- Determine role from metadata
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student');
  
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
  
  -- Insert role into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$function$;

COMMENT ON TABLE public.user_roles IS 'Stores user roles separately from profile data. Only service role can modify. Prevents privilege escalation attacks.';