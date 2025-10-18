import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { review_id, correct } = await req.json();

    if (!review_id || typeof correct !== 'boolean') {
      throw new Error('Invalid parameters: review_id and correct (boolean) are required');
    }

    console.log(`Processing review feedback for user ${user.id}: review_id=${review_id}, correct=${correct}`);

    // In a real implementation, this would:
    // 1. Update the flashcard's review statistics in the database
    // 2. Calculate the next review date based on SRS algorithm (SM-2 or similar)
    // 3. Update ease_factor based on performance
    // 4. Store the review result for analytics
    
    // Mock response simulating successful update
    const nextReviewDate = new Date();
    if (correct) {
      // If correct, schedule next review further out (e.g., 3 days)
      nextReviewDate.setDate(nextReviewDate.getDate() + 3);
    } else {
      // If incorrect, review again sooner (e.g., 1 day)
      nextReviewDate.setDate(nextReviewDate.getDate() + 1);
    }

    console.log(`Review feedback recorded. Next review scheduled for: ${nextReviewDate.toISOString()}`);

    return new Response(
      JSON.stringify({
        success: true,
        next_review_date: nextReviewDate.toISOString(),
        message: correct ? 'Ótimo trabalho!' : 'Continue praticando!'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in submit-review-feedback function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});