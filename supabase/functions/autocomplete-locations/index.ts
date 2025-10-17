import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header obrigatório' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query = '' } = await req.json();
    console.log('Searching locations for user:', user.id, 'query:', query);

    // Buscar locais do usuário com filtro de texto
    let locationQuery = supabase
      .from('internship_locations')
      .select('*')
      .eq('user_id', user.id)
      .order('usage_count', { ascending: false })
      .order('last_used_at', { ascending: false })
      .limit(10);

    // Se houver query, filtrar por nome
    if (query.trim()) {
      locationQuery = locationQuery.ilike('name', `%${query}%`);
    }

    const { data: locations, error } = await locationQuery;

    if (error) {
      console.error('Error fetching locations:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar locais' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular score e adicionar metadata
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const enrichedLocations = (locations || []).map(loc => {
      const lastUsed = new Date(loc.last_used_at);
      const isRecent = lastUsed > sevenDaysAgo;
      const isRecentMonth = lastUsed > thirtyDaysAgo;
      
      return {
        ...loc,
        isRecent,
        isFavorite: loc.usage_count >= 3,
        recencyLabel: isRecent ? 'Recente' : isRecentMonth ? 'Este mês' : null,
      };
    });

    // Limitar a 5 resultados mais relevantes
    const topResults = enrichedLocations.slice(0, 5);

    console.log('Found locations:', topResults.length);

    return new Response(
      JSON.stringify({ locations: topResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in autocomplete-locations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});