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
    const { structuredContent } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('[Validation Agent] Iniciando validação de conteúdo estruturado...');
    console.log(`[Validation Agent] Blocos a validar: ${structuredContent?.conteudo?.length || 0}`);

    const validationPrompt = `Você é um agente de validação e correção automática de conteúdo pedagógico estruturado.

TAREFA: Valide e corrija automaticamente o seguinte JSON estruturado. Você DEVE corrigir todos os erros encontrados SEM alterar o conteúdo pedagógico.

JSON A VALIDAR:
${JSON.stringify(structuredContent, null, 2)}

VERIFICAÇÕES E CORREÇÕES OBRIGATÓRIAS:

1. MERMAID DIAGRAMS (tipos: fluxograma, mapa_mental, diagrama, organograma):
   PROBLEMAS COMUNS:
   - Caracteres especiais: →, ←, ↔
   - Parênteses não balanceados: ( ) dentro de labels []
   - Caracteres especiais em labels: &, <, >, ", '
   
   CORREÇÕES AUTOMÁTICAS:
   - Substitua → por -->
   - Substitua ← por <--
   - Substitua ↔ por <-->
   - Remova parênteses dentro de [] ou substitua por hífen: "Estado (inicial)" → "Estado - inicial"
   - Remova &, <, >, ", ' de dentro de labels
   - Se encontrar erro, simplifique o diagrama mantendo a essência
   - Garanta que cada nó tenha um ID único e válido (A, B, C, etc.)

2. REFERÊNCIAS BIBLIOGRÁFICAS (tipo: referencias):
   PROBLEMAS COMUNS:
   - Referências em texto único sem quebras
   - Falta de separação entre referências
   - Campo 'texto' em vez de 'itens' array
   
   CORREÇÕES AUTOMÁTICAS:
   - SEMPRE converta para formato 'itens' array
   - Cada referência = um item do array
   - Formato de cada item: "[1]<br>Título<br>- URL: link<br><br>"
   - Separe cada referência com <br><br>
   - Se detectar padrão [1], [2], [3], divida em itens separados
   - Adicione quebras antes de "- URL:", "- Autor:", "- Acesso:"

3. POST-ITS e CAIXAS (tipos: post_it, caixa_de_destaque):
   PROBLEMAS COMUNS:
   - HTML inválido ou tags não fechadas
   - Tags não permitidas
   
   CORREÇÕES AUTOMÁTICAS:
   - Remova tags inválidas mantendo o texto
   - Feche tags não fechadas
   - Garanta HTML limpo e seguro

4. PARÁGRAFOS (tipo: paragrafo):
   PROBLEMAS COMUNS:
   - Tags HTML inválidas
   - Quebras de linha inconsistentes
   
   CORREÇÕES AUTOMÁTICAS:
   - Valide HTML
   - Mantenha <br> para quebras de linha
   - Remova tags não permitidas
   - Limpe formatação inconsistente

5. GRÁFICOS (tipo: grafico):
   PROBLEMAS COMUNS:
   - Dados com valores não numéricos
   - Categorias vazias
   
   CORREÇÕES AUTOMÁTICAS:
   - Converta valores para números
   - Remova itens inválidos
   - Garanta pelo menos 2 pontos de dados

IMPORTANTE:
- Retorne APENAS o JSON corrigido
- NÃO adicione explicações ou comentários
- NÃO mude o conteúdo pedagógico, apenas corrija formatação e sintaxe
- Se não puder corrigir um bloco, mantenha o original
- Mantenha a estrutura exata do JSON

FORMATO DE RETORNO (apenas o JSON, sem markdown):
{
  "titulo_geral": "...",
  "conteudo": [...]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: validationPrompt },
          { role: 'user', content: 'Valide e corrija o JSON fornecido.' }
        ],
        temperature: 0.3, // Lower temperature for more consistent validation
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Validation Agent] Erro na API:', response.status, errorText);
      throw new Error(`Erro na API de validação: ${response.status}`);
    }

    const data = await response.json();
    let validatedContent = data.choices[0].message.content.trim();

    console.log('[Validation Agent] Resposta recebida, processando...');

    // Clean the response
    validatedContent = validatedContent.replace(/^```(?:json)?\s*\n?/gm, '');
    validatedContent = validatedContent.replace(/\n?```\s*$/gm, '');
    
    const firstBrace = validatedContent.indexOf('{');
    const lastBrace = validatedContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      validatedContent = validatedContent.substring(firstBrace, lastBrace + 1).trim();
    }

    // Parse the validated JSON
    const validatedData = JSON.parse(validatedContent);

    console.log('[Validation Agent] ✅ Validação concluída com sucesso');
    console.log(`[Validation Agent] Blocos validados: ${validatedData.conteudo?.length || 0}`);

    // Additional post-processing for references
    if (validatedData.conteudo) {
      validatedData.conteudo = validatedData.conteudo.map((bloco: any) => {
        if (bloco.tipo === 'referencias') {
          // If it has 'texto' instead of 'itens', convert it
          if (bloco.texto && !bloco.itens) {
            console.log('[Validation Agent] Converting referencias from texto to itens array');
            const refs = bloco.texto.split(/(?=\[\d+\])/).filter((r: string) => r.trim());
            bloco.itens = refs.map((ref: string) => {
              let formatted = ref.trim();
              if (!formatted.endsWith('<br><br>')) {
                formatted += '<br><br>';
              }
              return formatted;
            });
            delete bloco.texto;
          }
          // Ensure each item ends with <br><br>
          if (bloco.itens && Array.isArray(bloco.itens)) {
            bloco.itens = bloco.itens.map((item: string) => {
              if (!item.endsWith('<br><br>')) {
                return item + '<br><br>';
              }
              return item;
            });
          }
        }
        return bloco;
      });
    }

    return new Response(JSON.stringify({ validatedContent: validatedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Validation Agent] ❌ Erro durante validação:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      // Return original content as fallback
      validatedContent: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
