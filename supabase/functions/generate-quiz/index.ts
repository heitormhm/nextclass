import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, transcript } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log(`Generating quiz for lecture ${lectureId}`);

    // Call OpenAI to generate quiz questions
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `You are an expert educational quiz generator. Generate a comprehensive quiz based on the lecture transcript provided. 
            
            For each question, you MUST include:
            1. The question text
            2. The type (multiple-choice, true-false, fill-blank, or short-answer)
            3. Options (for multiple-choice)
            4. The correct answer
            5. An explanation
            6. A sourceTimestamp (in "MM:SS" format) pointing to where in the lecture this concept was discussed
            
            Return ONLY valid JSON in this exact format:
            {
              "questions": [
                {
                  "id": 1,
                  "type": "multiple-choice",
                  "question": "Question text here",
                  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                  "correctAnswer": 0,
                  "explanation": "Explanation text",
                  "sourceTimestamp": "12:34"
                }
              ]
            }
            
            Generate 8-10 questions with a good mix of question types.`
          },
          {
            role: 'user',
            content: `Generate a quiz based on this lecture transcript:\n\n${transcript || 'Sample lecture about cardiovascular physiology, heart anatomy, and common cardiac pathologies.'}`
          }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    let quizData;
    try {
      quizData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Failed to parse quiz data from AI response');
    }

    console.log(`Successfully generated ${quizData.questions?.length || 0} questions`);

    return new Response(
      JSON.stringify({
        success: true,
        quiz: quizData,
        totalQuestions: quizData.questions?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-quiz function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
