/**
 * Quiz Generation Service
 * Handles quiz generation using AI
 */

import { callAIWithRetry } from './ai-client.ts';
import { sanitizeJSON } from '../utils/common.ts';
import { QUIZ_SYSTEM_PROMPT, createQuizUserPrompt } from '../prompts/quiz-generation-prompt.ts';

/**
 * Generate quiz questions from lecture content
 */
export async function processQuizGeneration(
  job: any,
  supabase: any,
  lovableApiKey: string
) {
  const { title, transcript, tags } = job.input_payload;
  
  console.log(`[Job ${job.id}] 📝 Generating quiz for: ${title}`);
  
  // Call AI to generate quiz questions
  const aiData = await callAIWithRetry(lovableApiKey, {
    model: 'google/gemini-2.5-flash',
    systemPrompt: QUIZ_SYSTEM_PROMPT,
    userPrompt: createQuizUserPrompt(title, tags || [], transcript),
    timeout: 60000
  }, job.id);

  const content = aiData.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in AI response');

  const parsedData = JSON.parse(sanitizeJSON(content));
  
  // Save quiz to database
  await supabase.from('teacher_quizzes').insert({
    lecture_id: job.lecture_id,
    teacher_id: job.teacher_id,
    title: title || 'Quiz',
    questions: parsedData.questions
  });
  
  // Mark job as completed
  await supabase.from('teacher_jobs').update({
    status: 'COMPLETED',
    result_payload: parsedData,
    updated_at: new Date().toISOString()
  }).eq('id', job.id);
  
  console.log(`[Job ${job.id}] ✅ Quiz generated with ${parsedData.questions?.length || 0} questions`);
}
