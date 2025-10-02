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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Generating quiz for lecture ${lectureId}`);

    // Call Lovable AI Gateway to generate quiz questions
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an AI that creates educational quizzes for engineering students. Generate a comprehensive quiz based ONLY on the lecture transcript provided. 
            
            IMPORTANT: Questions must be technical and relevant to engineering concepts discussed in the lecture. Focus on:
            - Engineering principles (thermodynamics, mechanics, circuits, structures, materials, etc.)
            - Technical calculations and analysis
            - Design principles and methodologies
            - Engineering problem-solving approaches
            
            For each question, you MUST include:
            1. The question text (focused on engineering concepts)
            2. The type (multiple-choice, true-false, fill-blank, or short-answer)
            3. Options (for multiple-choice) - all options must be technically plausible
            4. The correct answer
            5. An explanation with technical reasoning
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
            
            Generate 8-10 questions with a good mix of question types. Focus on testing understanding of engineering concepts, calculations, and applications.`
          },
          {
            role: 'user',
            content: `Generate an engineering-focused quiz based on this lecture transcript:\n\n${transcript || 'Sample lecture about structural analysis, stress calculations in beams, and deflection limits in engineering design.'}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI credits depleted. Please add funds to continue.');
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
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
