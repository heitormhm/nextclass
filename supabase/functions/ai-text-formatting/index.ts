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
    const { content, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    let systemPrompt = '';
    
    switch (action) {
      case 'fix_grammar':
        systemPrompt = 'Você é um revisor de textos especializado em engenharia. Corrija APENAS erros gramaticais, ortográficos e de pontuação. Mantenha o tom e estilo original. Retorne apenas o texto corrigido em HTML.';
        break;
      case 'tone_formal':
        systemPrompt = 'Reescreva o texto em um tom FORMAL e acadêmico, apropriado para contexto de engenharia, mantendo todas as informações técnicas. Retorne em HTML.';
        break;
      case 'tone_informal':
        systemPrompt = 'Reescreva o texto em um tom INFORMAL e descontraído, como se estivesse explicando para um colega, mantendo todas as informações técnicas. Retorne em HTML.';
        break;
      case 'tone_professional':
        systemPrompt = 'Reescreva o texto em um tom PROFISSIONAL e técnico, apropriado para relatórios de engenharia, mantendo todas as informações. Retorne em HTML.';
        break;
      case 'extend_text':
        systemPrompt = 'Expanda o texto adicionando mais detalhes técnicos, exemplos práticos de engenharia e explicações aprofundadas, mantendo o mesmo tom. Retorne em HTML.';
        break;
      case 'shorten_text':
        systemPrompt = 'Resuma o texto de forma concisa, mantendo apenas as informações essenciais e os conceitos técnicos principais. Retorne em HTML.';
        break;
      case 'improve_didactic':
        systemPrompt = 'Reescreva o texto tornando-o mais didático, claro e fácil de entender para estudantes de engenharia. Adicione exemplos práticos e analogias se necessário. Retorne em formato JSON: { "formattedContent": "<html>", "suggestions": "lista de melhorias sugeridas" }';
        break;
      case 'fact_check':
        systemPrompt = 'Analise o texto de engenharia e identifique possíveis erros factuais, conceitos incorretos, fórmulas erradas ou informações duvidosas. Retorne em JSON: { "formattedContent": "<html com correções>", "suggestions": "lista detalhada de erros encontrados e correções" }';
        break;
      default:
        throw new Error('Ação inválida');
    }

    console.log('Processando ação:', action);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Texto a processar:\n\n${content}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API:', response.status, errorText);
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content.trim();
    
    let formattedContent = result;
    let suggestions = null;
    
    if (action === 'improve_didactic' || action === 'fact_check') {
      try {
        const parsed = JSON.parse(result);
        formattedContent = parsed.formattedContent;
        suggestions = parsed.suggestions;
      } catch {
        formattedContent = result;
      }
    }

    console.log('Processamento concluído com sucesso');

    return new Response(JSON.stringify({ 
      formattedContent,
      suggestions 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao processar texto:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
