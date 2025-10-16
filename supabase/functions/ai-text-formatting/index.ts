import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function cleanHTMLResponse(text: string): string {
  // Remove markdown code blocks
  text = text.replace(/```html\n?/g, '').replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Remove JSON wrapper if present
  const jsonMatch = text.match(/\{\s*"formattedContent"\s*:\s*"(.+)"\s*,?\s*"suggestions"?\s*:\s*"?(.*)?"?\s*\}/s);
  if (jsonMatch) {
    return jsonMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }
  
  // Remove escaped quotes and newlines
  text = text.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  
  return text.trim();
}

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
        systemPrompt = 'Você é um revisor de textos especializado em engenharia. Corrija APENAS erros gramaticais, ortográficos e de pontuação. Mantenha o tom e estilo original. Retorne SOMENTE o HTML corrigido, sem markdown, sem JSON, sem explicações.';
        break;
      case 'tone_formal':
        systemPrompt = 'Reescreva o texto em um tom FORMAL e acadêmico. Use vocabulário preciso e técnico, terminologia científica apropriada, estruturas gramaticais complexas e elaboradas. Evite contrações, gírias e expressões coloquiais. Mantenha todas as informações técnicas. Retorne SOMENTE o HTML formatado, sem markdown, sem JSON.';
        break;
      case 'tone_informal':
        systemPrompt = 'Reescreva o texto em um tom INFORMAL e descontraído. Use linguagem do dia a dia, expressões coloquiais, analogias simples e exemplos práticos. Pode usar contrações (ex: "tá", "pra") e linguagem mais acessível. Mantenha todas as informações técnicas mas explique de forma simples. Retorne SOMENTE o HTML formatado, sem markdown, sem JSON.';
        break;
      case 'tone_professional':
        systemPrompt = 'Reescreva o texto em um tom PROFISSIONAL e técnico. Use jargão especializado de engenharia, terminologia técnica precisa, siglas e abreviações da área (ex: "NBR", "ABNT", "ISO"). Estruture como um relatório técnico profissional. Mantenha todas as informações. Retorne SOMENTE o HTML formatado, sem markdown, sem JSON.';
        break;
      case 'extend_text':
        systemPrompt = 'Expanda o texto adicionando mais detalhes técnicos, exemplos práticos de engenharia e explicações aprofundadas, mantendo o mesmo tom. Retorne SOMENTE o HTML formatado, sem markdown, sem JSON.';
        break;
      case 'shorten_text':
        systemPrompt = 'Resuma o texto de forma concisa, mantendo apenas as informações essenciais e os conceitos técnicos principais. Retorne SOMENTE o HTML formatado, sem markdown, sem JSON.';
        break;
      case 'improve_didactic':
        systemPrompt = 'Reescreva o texto tornando-o EXTREMAMENTE didático para estudantes de engenharia. OBRIGATÓRIO incluir: 1) Tabelas HTML (<table>) para comparações e dados; 2) Listas com bullet points (<ul><li>); 3) Diagramas em ASCII art ou descrições de fluxogramas; 4) Seções com títulos (<h3>); 5) Boxes de destaque para conceitos-chave (<div class="highlight" style="background:#fef3c7;padding:1rem;border-left:4px solid #f59e0b;margin:1rem 0">); 6) Exemplos práticos numerados; 7) Analogias do cotidiano. Retorne em formato JSON: { "formattedContent": "<html rico>", "suggestions": "lista de melhorias sugeridas" }';
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
    let result = data.choices[0].message.content.trim();
    
    // Clean the response
    result = cleanHTMLResponse(result);
    
    let formattedContent = result;
    let suggestions = null;
    
    // For didactic and fact_check, try to parse JSON but fallback to cleaned HTML
    if (action === 'improve_didactic' || action === 'fact_check') {
      try {
        const parsed = JSON.parse(result);
        formattedContent = cleanHTMLResponse(parsed.formattedContent || result);
        suggestions = parsed.suggestions;
      } catch {
        formattedContent = result; // Already cleaned
      }
    } else {
      formattedContent = result; // Already cleaned
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
