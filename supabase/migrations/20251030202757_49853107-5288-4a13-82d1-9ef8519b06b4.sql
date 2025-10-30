-- Create Foreign Key between lectures.teacher_id and users.id
-- This enables proper JOIN queries and ensures referential integrity

-- Step 1: Add Foreign Key Constraint
ALTER TABLE lectures 
ADD CONSTRAINT fk_lectures_teacher 
FOREIGN KEY (teacher_id) 
REFERENCES users(id) 
ON DELETE SET NULL;

-- Step 2: Create Index for Performance
CREATE INDEX IF NOT EXISTS idx_lectures_teacher_id 
ON lectures(teacher_id);

-- Step 3: Add comment for documentation
COMMENT ON CONSTRAINT fk_lectures_teacher ON lectures 
IS 'Foreign key linking lectures to their teacher in users table. ON DELETE SET NULL ensures lectures remain if teacher is deleted.';