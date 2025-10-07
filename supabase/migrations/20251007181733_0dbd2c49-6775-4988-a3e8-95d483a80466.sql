-- Step 1: Create user_roles table for secure role management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 2: Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 3: Create function to get user role (for backward compatibility)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Step 4: Migrate existing roles from users table to user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.users
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Update RLS policies that reference the role column

-- Drop and recreate the problematic policies on turma_enrollments
DROP POLICY IF EXISTS "Teachers can view all enrollments" ON public.turma_enrollments;
CREATE POLICY "Teachers can view all enrollments"
ON public.turma_enrollments
FOR SELECT
USING (public.has_role(auth.uid(), 'teacher'));

-- Drop and recreate the problematic policies on turmas
DROP POLICY IF EXISTS "Teachers can view all turmas" ON public.turmas;
CREATE POLICY "Teachers can view all turmas"
ON public.turmas
FOR SELECT
USING (public.has_role(auth.uid(), 'teacher'));

-- Step 6: Add RLS policies for user_roles table
-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- No one can insert/update/delete roles via the API (only through secure backend functions)
-- This prevents privilege escalation attacks

-- Step 7: Prevent users from updating the role column in users table
-- Update the users table UPDATE policy to exclude the role column
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Prevent users from changing their role
  (SELECT role FROM public.users WHERE id = auth.uid()) = role
);

-- Step 8: Add trigger to keep users.role in sync with user_roles (for backward compatibility)
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the role in users table when user_roles changes
  UPDATE public.users
  SET role = NEW.role, updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_user_role_trigger
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role();

-- Step 9: Add comments for documentation
COMMENT ON TABLE public.user_roles IS 'Secure storage for user roles - separated from users table to prevent privilege escalation';
COMMENT ON FUNCTION public.has_role IS 'Security definer function to check user roles - prevents recursive RLS issues';