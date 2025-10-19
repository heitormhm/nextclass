-- Add explicit DENY policies for user_roles table to prevent privilege escalation
-- Only system triggers should be able to modify roles

-- Prevent direct role insertions (only handle_new_user trigger should insert)
CREATE POLICY "block_role_insertions"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (false);

-- Prevent role modifications (only admins via service role should modify)
CREATE POLICY "block_role_updates"
ON user_roles FOR UPDATE
TO authenticated
USING (false);

-- Prevent role deletions (only admins via service role should delete)
CREATE POLICY "block_role_deletions"
ON user_roles FOR DELETE
TO authenticated
USING (false);