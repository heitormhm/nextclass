-- Add missing service role policies to teacher_jobs table
-- This allows edge functions to create and read jobs without user context

CREATE POLICY "Service role can insert jobs"
ON teacher_jobs FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can read jobs"
ON teacher_jobs FOR SELECT
TO service_role
USING (true);