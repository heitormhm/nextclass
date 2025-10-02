import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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

    console.log('Fetching due reviews for user:', user.id);

    // Mock data - in a real app, this would query the database based on SRS algorithm
    // The SRS algorithm would calculate which cards are due based on:
    // - last_reviewed timestamp
    // - review_interval (days until next review)
    // - ease_factor (difficulty modifier)
    const dueReviews = [
      {
        review_id: '1',
        card_id: '1',
        term: 'Sístole',
        definition: 'Fase de contração do músculo cardíaco, quando o sangue é bombeado para fora do coração.',
        course_name: 'Fisiopatologia Cardiovascular',
        last_reviewed: null,
        review_count: 0
      },
      {
        review_id: '2',
        card_id: '2',
        term: 'Diástole',
        definition: 'Fase de relaxamento do músculo cardíaco, quando as câmaras do coração se enchem de sangue.',
        course_name: 'Fisiopatologia Cardiovascular',
        last_reviewed: null,
        review_count: 0
      },
      {
        review_id: '3',
        card_id: '3',
        term: 'Válvula Mitral',
        definition: 'Válvula cardíaca localizada entre o átrio esquerdo e o ventrículo esquerdo, também conhecida como válvula bicúspide.',
        course_name: 'Anatomia Cardíaca',
        last_reviewed: null,
        review_count: 0
      },
      {
        review_id: '4',
        card_id: '4',
        term: 'Nó Sinoatrial',
        definition: 'Marca-passo natural do coração, localizado no átrio direito, que inicia o impulso elétrico cardíaco.',
        course_name: 'Fisiologia Cardíaca',
        last_reviewed: null,
        review_count: 0
      },
      {
        review_id: '5',
        card_id: '5',
        term: 'Pressão Arterial Sistólica',
        definition: 'Pressão máxima nas artérias durante a contração do ventrículo esquerdo, normalmente cerca de 120 mmHg.',
        course_name: 'Fisiopatologia Cardiovascular',
        last_reviewed: null,
        review_count: 0
      }
    ];

    console.log(`Returning ${dueReviews.length} due reviews`);

    return new Response(
      JSON.stringify({ reviews: dueReviews }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-due-reviews function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});