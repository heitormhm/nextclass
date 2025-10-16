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
        systemPrompt = 'Você é um revisor de textos especializado em engenharia. Corrija APENAS erros gramaticais, ortográficos e de pontuação. Mantenha o tom e estilo original. **IMPORTANTE: TODO o conteúdo DEVE estar em PORTUGUÊS BRASILEIRO.** Retorne SOMENTE o HTML corrigido, sem markdown, sem JSON, sem explicações.';
        break;
      case 'tone_formal':
        systemPrompt = 'Reescreva o texto em um tom FORMAL e acadêmico. Use vocabulário preciso e técnico, terminologia científica apropriada, estruturas gramaticais complexas e elaboradas. Evite contrações, gírias e expressões coloquiais. **IMPORTANTE: TODO o conteúdo, incluindo termos técnicos, DEVE estar em PORTUGUÊS BRASILEIRO.** Retorne SOMENTE o HTML formatado, sem markdown, sem JSON.';
        break;
      case 'tone_informal':
        systemPrompt = 'Reescreva o texto em um tom INFORMAL e descontraído. Use linguagem do dia a dia, expressões coloquiais brasileiras, analogias simples e exemplos práticos. Pode usar contrações típicas do português brasileiro (ex: "tá", "pra", "né"). **IMPORTANTE: TODO o conteúdo DEVE estar em PORTUGUÊS BRASILEIRO.** Retorne SOMENTE o HTML formatado, sem markdown, sem JSON.';
        break;
      case 'tone_professional':
        systemPrompt = 'Reescreva o texto em um tom PROFISSIONAL e técnico. Use jargão especializado de engenharia em português brasileiro, terminologia técnica precisa, siglas e abreviações da área brasileira (ex: "NBR", "ABNT", "ISO"). Estruture como um relatório técnico profissional. **IMPORTANTE: TODO o conteúdo, incluindo jargões técnicos, DEVE estar em PORTUGUÊS BRASILEIRO.** Retorne SOMENTE o HTML formatado, sem markdown, sem JSON.';
        break;
      case 'extend_text':
        systemPrompt = 'Expanda o texto adicionando mais detalhes técnicos, exemplos práticos de engenharia brasileira e explicações aprofundadas, mantendo o mesmo tom. **IMPORTANTE: TODO o conteúdo DEVE estar em PORTUGUÊS BRASILEIRO.** Retorne SOMENTE o HTML formatado, sem markdown, sem JSON.';
        break;
      case 'shorten_text':
        systemPrompt = 'Resuma o texto de forma concisa, mantendo apenas as informações essenciais e os conceitos técnicos principais. **IMPORTANTE: TODO o conteúdo DEVE estar em PORTUGUÊS BRASILEIRO.** Retorne SOMENTE o HTML formatado, sem markdown, sem JSON.';
        break;
      case 'improve_didactic':
        systemPrompt = `Reescreva o texto tornando-o EXTREMAMENTE didático para estudantes de engenharia brasileiros. 

**REGRA ABSOLUTA: TODO O CONTEÚDO DEVE ESTAR EM PORTUGUÊS BRASILEIRO - incluindo títulos de tabelas, labels de diagramas, legendas, exemplos e qualquer texto técnico. NUNCA use inglês.**

OBRIGATÓRIO incluir:

1) **Tabelas HTML** com cabeçalhos e conteúdo EM PORTUGUÊS:
   <table style="border-collapse:collapse;width:100%;margin:1rem 0">
     <thead><tr style="background:#8b5cf6;color:white"><th style="padding:0.5rem;border:1px solid #ccc">Parâmetro</th><th style="padding:0.5rem;border:1px solid #ccc">Valor</th></tr></thead>
     <tbody><tr><td style="padding:0.5rem;border:1px solid #ccc">Exemplo</td><td style="padding:0.5rem;border:1px solid #ccc">Dados</td></tr></tbody>
   </table>

2) **Listas organizadas** com bullet points:
   <ul><li>Ponto importante 1</li><li>Ponto importante 2</li></ul>

3) **Diagramas visuais ricos** usando caracteres Unicode BOX DRAWING (┌─┐│└┘├┤┬┴┼) e emojis técnicos:
   <pre style="background:#f3f4f6;padding:1rem;border-radius:8px;font-family:monospace;line-height:1.8">
   
   ⚙️ SISTEMA HIDRÁULICO
   
   ┌─────────────────┐
   │  🔧 ENTRADA     │ ──→ Força Pequena (F₁)
   │  Área: A₁       │
   └────────┬────────┘
            │
       💧 Fluido
            │
   ┌────────┴────────┐
   │  🔧 SAÍDA       │ ──→ Força Grande (F₂)
   │  Área: A₂       │
   └─────────────────┘
   
   📊 F₂ = F₁ × (A₂/A₁)
   </pre>

4) **Seções com títulos descritivos EM PORTUGUÊS:**
   <h3 style="color:#8b5cf6;margin-top:1.5rem">📚 Conceito Fundamental</h3>

5) **Boxes de destaque** para conceitos-chave:
   <div style="background:#fef3c7;padding:1rem;border-left:4px solid #f59e0b;margin:1rem 0;border-radius:4px">
   <strong>⚡ Conceito-Chave:</strong> Explicação importante aqui
   </div>

6) **Exemplos práticos numerados** com contexto brasileiro:
   <div style="background:#dbeafe;padding:1rem;margin:1rem 0;border-radius:4px">
   <strong>🔍 Exemplo Prático 1:</strong> [Cenário real brasileiro]
   </div>

7) **Analogias do cotidiano brasileiro** para facilitar compreensão

**LEMBRE-SE: Absolutamente TODO texto gerado (tabelas, diagramas, labels, legendas, exemplos) DEVE estar em PORTUGUÊS BRASILEIRO. Não misture com inglês.**

Retorne em formato JSON: 
{ 
  "formattedContent": "<html rico e visual em português>", 
  "suggestions": "lista de melhorias sugeridas em português" 
}`;
        break;
      case 'fact_check':
        systemPrompt = 'Analise o texto tecnicamente e verifique a precisão das informações de engenharia. Destaque possíveis erros, imprecisões ou conceitos que precisam de verificação. **IMPORTANTE: TODO o conteúdo DEVE estar em PORTUGUÊS BRASILEIRO.** Retorne JSON: { "formattedContent": "<html com anotações>", "suggestions": "lista de pontos a verificar" }';
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
