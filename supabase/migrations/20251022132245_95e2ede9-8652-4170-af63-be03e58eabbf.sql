-- Allow admins to view all user profiles
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Allow admins to view all user roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

COMMENT ON POLICY "Admins can view all users" ON public.users IS 
'Admins need to view all users for administrative purposes. Uses is_admin() function for security.';

COMMENT ON POLICY "Admins can view all user roles" ON public.user_roles IS 
'Admins need to view all user roles to manage the system. Uses is_admin() function for security.';