import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, firstMessage } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('[TEACHER] Gerando título pedagógico para conversa:', conversationId);

    // Gerar título com IA - FOCO PEDAGÓGICO
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
            content: `Você é um assistente que gera títulos concisos (máximo 6 palavras) para conversas pedagógicas de professores de engenharia. 

INSTRUÇÕES CRÍTICAS:
- Identifique o tipo de conteúdo: plano de aula, avaliação, material didático, estratégia pedagógica, etc.
- Use prefixos pedagógicos quando apropriado:
  * "Plano:" para planos de aula
  * "Avaliação:" para atividades avaliativas
  * "Material:" para criação de conteúdo educacional
  * "Estratégia:" para discussões pedagógicas
  * "Recurso:" para materiais de apoio
- Seja específico sobre o tópico técnico (ex: "Plano: Termodinâmica PBL" em vez de "Plano de Aula")
- Retorne APENAS o título, sem aspas ou formatação adicional.

Exemplos:
- Entrada: "Como criar um plano de aula sobre circuitos elétricos..."
  Saída: Plano: Circuitos Elétricos PBL

- Entrada: "Preciso de uma rubrica de avaliação para..."
  Saída: Avaliação: Rubrica de Projeto

- Entrada: "Gere um estudo de caso sobre..."
  Saída: Material: Estudo de Caso Estruturas`
          },
          {
            role: 'user',
            content: `Gere um título conciso e pedagógico para esta conversa de professor: "${firstMessage.substring(0, 200)}"`
          }
        ],
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TEACHER] AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const title = data.choices[0]?.message?.content?.trim() || 'Nova Conversa Pedagógica';

    console.log('[TEACHER] Título pedagógico gerado:', title);

    // Atualizar título na tabela
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabaseClient
      .from('conversations')
      .update({ title })
      .eq('id', conversationId);

    if (updateError) {
      console.error('[TEACHER] Error updating conversation title:', updateError);
      throw updateError;
    }

    console.log('[TEACHER] Título atualizado com sucesso');

    return new Response(
      JSON.stringify({ title }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TEACHER] Error generating title:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
