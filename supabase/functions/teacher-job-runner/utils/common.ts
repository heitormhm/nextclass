/**
 * Common utility functions
 */

export function sanitizeJSON(text: string): string {
  return text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

export async function updateJobProgress(
  supabase: any,
  jobId: string,
  progress: number,
  message: string
) {
  console.log(`[Job ${jobId}] 📊 ${Math.round(progress * 100)}%: ${message}`);
  
  await supabase
    .from('teacher_jobs')
    .update({
      progress,
      progress_message: message,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}
