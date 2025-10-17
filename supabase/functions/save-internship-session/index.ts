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

    const { 
      internshipType, 
      locationName, 
      locationDetails, 
      tags, 
      transcript, 
      aiSummary, 
      duration 
    } = await req.json();

    console.log('Saving internship session for user:', user.id);

    // 1. Salvar ou atualizar location
    const { data: existingLocation } = await supabase
      .from('internship_locations')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', locationName)
      .single();

    if (existingLocation) {
      // Atualizar contador de uso
      await supabase
        .from('internship_locations')
        .update({
          usage_count: existingLocation.usage_count + 1,
          last_used_at: new Date().toISOString(),
          full_address: locationDetails || existingLocation.full_address
        })
        .eq('id', existingLocation.id);
    } else {
      // Criar novo location
      await supabase
        .from('internship_locations')
        .insert({
          user_id: user.id,
          name: locationName,
          full_address: locationDetails,
          usage_count: 1
        });
    }

    // 2. Atualizar ou criar tags
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        const { data: existingTag } = await supabase
          .from('internship_tags')
          .select('*')
          .eq('user_id', user.id)
          .eq('tag', tag)
          .single();

        if (existingTag) {
          await supabase
            .from('internship_tags')
            .update({
              usage_count: existingTag.usage_count + 1,
              last_used_at: new Date().toISOString()
            })
            .eq('id', existingTag.id);
        } else {
          await supabase
            .from('internship_tags')
            .insert({
              user_id: user.id,
              tag,
              usage_count: 1
            });
        }
      }
    }

    // 3. Salvar sessão de estágio
    const { data: session, error: sessionError } = await supabase
      .from('internship_sessions')
      .insert({
        user_id: user.id,
        internship_type: internshipType,
        location_name: locationName,
        location_details: locationDetails,
        tags: tags || [],
        transcript,
        ai_summary: aiSummary,
        duration
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error saving session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar sessão' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Criar anotação automática
    const annotationContent = typeof aiSummary === 'string' 
      ? aiSummary 
      : JSON.stringify(aiSummary, null, 2);

    await supabase
      .from('annotations')
      .insert({
        user_id: user.id,
        title: `${internshipType} - ${locationName}`,
        content: annotationContent,
        tags: tags || [],
        source_type: 'internship_session',
        source_id: session.id
      });

    console.log('Session saved successfully:', session.id);

    return new Response(
      JSON.stringify({ session }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in save-internship-session:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});