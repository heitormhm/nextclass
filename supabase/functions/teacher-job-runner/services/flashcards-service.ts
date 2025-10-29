/**
 * Flashcards Generation Service
 * Handles flashcard generation using AI
 */

import { callAIWithRetry } from './ai-client.ts';
import { sanitizeJSON } from '../utils/common.ts';
import { FLASHCARDS_SYSTEM_PROMPT, createFlashcardsUserPrompt } from '../prompts/flashcards-generation-prompt.ts';

/**
 * Generate flashcards from lecture content
 */
export async function processFlashcardsGeneration(
  job: any,
  supabase: any,
  lovableApiKey: string
) {
  const { title, transcript, tags } = job.input_payload;
  
  console.log(`[Job ${job.id}] 🃏 Generating flashcards for: ${title}`);
  
  // Call AI to generate flashcards
  const aiData = await callAIWithRetry(lovableApiKey, {
    model: 'google/gemini-2.5-flash',
    systemPrompt: FLASHCARDS_SYSTEM_PROMPT,
    userPrompt: createFlashcardsUserPrompt(title, tags || [], transcript),
    timeout: 60000
  }, job.id);

  const content = aiData.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in AI response');

  const parsedData = JSON.parse(sanitizeJSON(content));
  
  // Save flashcards to database
  await supabase.from('teacher_flashcards').insert({
    lecture_id: job.lecture_id,
    teacher_id: job.teacher_id,
    title: title || 'Flashcards',
    cards: parsedData.cards
  });
  
  // Mark job as completed
  await supabase.from('teacher_jobs').update({
    status: 'COMPLETED',
    result_payload: parsedData,
    updated_at: new Date().toISOString()
  }).eq('id', job.id);
  
  console.log(`[Job ${job.id}] ✅ Flashcards generated with ${parsedData.cards?.length || 0} cards`);
}
