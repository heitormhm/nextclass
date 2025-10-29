/**
 * Transcript Processing Service
 * Handles lecture transcript processing
 */

import { updateJobProgress } from '../utils/common.ts';

/**
 * Process lecture transcript by calling the dedicated edge function
 */
export async function processTranscript(job: any, supabase: any) {
  const { lectureId, transcript } = job.input_payload;
  
  console.log(`[Job ${job.id}] 📝 Processing transcript for lecture ${lectureId}`);
  
  await updateJobProgress(supabase, job.id, 0.2, 'Analisando transcrição...');
  
  // Call the dedicated transcript processing edge function
  const response = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-lecture-transcript`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lectureId,
        transcript,
        topic: 'Engenharia'
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Processamento falhou: ${response.status}`);
  }
  
  await updateJobProgress(supabase, job.id, 1.0, 'Concluído!');
  
  await supabase.from('teacher_jobs').update({
    status: 'COMPLETED',
    updated_at: new Date().toISOString()
  }).eq('id', job.id);
  
  console.log(`[Job ${job.id}] ✅ Transcript processed successfully`);
}
