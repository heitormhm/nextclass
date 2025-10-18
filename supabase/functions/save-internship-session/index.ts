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
      duration 
    } = await req.json();

    // Validate required fields
    if (!internshipType || !locationName) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: internshipType, locationName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate AI summary if transcript exists
    let aiSummary = null;

    if (transcript && transcript.length > 0) {
      try {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        const transcriptText = transcript
          .map((entry: any) => `${entry.speaker}: ${entry.text}`)
          .join('\n');

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
                content: 'Você é um especialista em análise de estágios de engenharia. Gere resumos estruturados em português.'
              },
              {
                role: 'user',
                content: `Analise esta transcrição de estágio em ${internshipType} e gere um resumo estruturado:

${transcriptText}

Retorne em formato JSON com as seguintes seções (arrays de strings):
- chiefComplaint: principais tópicos discutidos (3-5 itens)
- historyOfPresentIllness: contexto e histórico (3-5 itens)
- physicalExamination: observações técnicas (3-5 itens)
- assessmentAndPlan: conclusões e recomendações (3-5 itens)
- title: título resumido (uma linha)
- description: descrição breve (uma frase)

Responda apenas com o JSON válido, sem markdown.`
              }
            ],
            tools: [{
              type: "function",
              function: {
                name: "generate_summary",
                description: "Generate structured internship summary",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    chiefComplaint: { type: "array", items: { type: "string" } },
                    historyOfPresentIllness: { type: "array", items: { type: "string" } },
                    physicalExamination: { type: "array", items: { type: "string" } },
                    assessmentAndPlan: { type: "array", items: { type: "string" } }
                  },
                  required: ["title", "description", "chiefComplaint", "historyOfPresentIllness", "physicalExamination", "assessmentAndPlan"]
                }
              }
            }],
            tool_choice: { type: "function", function: { name: "generate_summary" } }
          }),
        });

        if (response.ok) {
          const aiData = await response.json();
          const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            aiSummary = JSON.parse(toolCall.function.arguments);
          }
        } else {
          console.error('AI API error:', await response.text());
        }
      } catch (error) {
        console.error('Error generating AI summary:', error);
      }
    }

    // Fallback summary if AI fails or no transcript
    if (!aiSummary) {
      aiSummary = {
        title: `${internshipType} - ${locationName}`,
        description: `Sessão de ${Math.floor(duration / 60)} minutos`,
        chiefComplaint: ['Sessão registrada sem transcrição'],
        historyOfPresentIllness: ['Dados básicos salvos'],
        physicalExamination: ['Aguardando processamento detalhado'],
        assessmentAndPlan: ['Resumo será gerado quando houver transcrição disponível']
      };
    }

    console.log('Saving internship session for user:', user.id);

    // 1. Salvar ou atualizar location (compartilhado entre todos os usuários)
    const { data: existingLocation } = await supabase
      .from('internship_locations')
      .select('*')
      .eq('name', locationName)
      .maybeSingle();

    if (existingLocation) {
      // Atualizar contador de uso (local já existe, criado por qualquer usuário)
      await supabase
        .from('internship_locations')
        .update({
          usage_count: existingLocation.usage_count + 1,
          last_used_at: new Date().toISOString(),
          full_address: locationDetails || existingLocation.full_address
        })
        .eq('id', existingLocation.id);
    } else {
      // Criar novo location (será compartilhado com todos)
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