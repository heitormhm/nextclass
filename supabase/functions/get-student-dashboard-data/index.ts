import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log(`Fetching dashboard data for user: ${user.id}`);

    // TODO: In a real application, this would query actual user performance data
    // For now, we'll return mock data based on the user's profile
    
    // Fetch user profile to personalize the recommendation
    const { data: profile } = await supabase
      .from('users')
      .select('full_name, course')
      .eq('id', user.id)
      .single();

    // Generate personalized recommendation
    const recommendations = [
      {
        text: 'Sua pontuação em Termodinâmica foi de 65%. Que tal revisar os flashcards?',
        link: '/courses',
        priority: 'high'
      },
      {
        text: 'Você está próximo de completar o módulo de Circuitos Elétricos. Continue assim!',
        link: '/courses',
        priority: 'medium'
      },
      {
        text: 'Seu desempenho em Mecânica dos Fluidos melhorou 20% esta semana!',
        link: '/grades',
        priority: 'low'
      }
    ];

    // Select a recommendation (in real app, this would be based on actual performance data)
    const recommendation = recommendations[Math.floor(Math.random() * recommendations.length)];

    // Calculate due flashcards count (in real app, query from database)
    const dueFlashcardsCount = Math.floor(Math.random() * 20) + 5; // Random between 5-25

    const responseData = {
      recommendation: {
        text: recommendation.text,
        link: recommendation.link,
        priority: recommendation.priority
      },
      dueFlashcardsCount
    };

    console.log('Returning dashboard data:', responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-student-dashboard-data function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      {
        status: errorMessage === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
