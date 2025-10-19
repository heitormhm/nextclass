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

    const validationPrompt = `Você é um agente de CORREÇÃO AUTOMÁTICA de conteúdo pedagógico estruturado.

TAREFA CRÍTICA: Corrija AUTOMATICAMENTE todos os erros no JSON a seguir. NÃO apenas valide, CORRIJA!

JSON A CORRIGIR:
${JSON.stringify(structuredContent, null, 2)}

CORREÇÕES OBRIGATÓRIAS:

1. MERMAID DIAGRAMS - CORREÇÕES AUTOMÁTICAS AGRESSIVAS:
   
   PROBLEMA: Caracteres especiais (→, ←, ↔, ⇒, ⇐, ⇔)
   CORREÇÃO: Substituir por --> <-- <--> ==> <== <==>
   
   PROBLEMA: Parênteses não balanceados em labels: A[Texto (não fechado]
   CORREÇÃO: Remover parênteses: A[Texto - não fechado]
   
   PROBLEMA: Sintaxe complexa que causa erro de renderização
   CORREÇÃO: SIMPLIFICAR o diagrama mantendo a essência pedagógica
   
   EXEMPLOS DE SIMPLIFICAÇÃO:
   
   ❌ ANTES (com erro):
   mindmap
     root((Conceito Principal))
       Item A
         Subitem (com parênteses não balanceados)
         Fórmula: (P/γ) + (V²/2g) + z
   
   ✅ DEPOIS (simplificado e corrigido):
   mindmap
     root((Conceito Principal))
       Item A
         Subitem com detalhes
         Fórmula de energia
   
   ❌ ANTES (com setas especiais):
   graph TD
     A[Início] → B[Processo]
     B ← C[Feedback]
   
   ✅ DEPOIS (corrigido):
   graph TD
     A[Início] --> B[Processo]
     B <-- C[Feedback]
   
   INSTRUÇÕES ESPECÍFICAS PARA MERMAID:
   - Remova TODOS os caracteres Unicode especiais de setas
   - Substitua parênteses dentro de labels por traços ou remova
   - Se um label tiver fórmula complexa, simplifique para texto descritivo
   - Garanta que todos os nodes tenham IDs únicos e válidos
   - Se houver erro de sintaxe não corrigível, crie versão simplificada

2. REFERÊNCIAS BIBLIOGRÁFICAS - GARANTIR QUEBRAS DE LINHA:
   
   ❌ ERRO: Referencias em campo 'texto' único sem quebras
   ✅ CORREÇÃO: Converter para campo 'itens' array com formatação:
   
   {
     "tipo": "referencias",
     "titulo": "Referências Bibliográficas",
     "itens": [
       "[1]<br>Título completo da primeira fonte<br>- URL: https://exemplo.com<br><br>",
       "[2]<br>Título completo da segunda fonte<br>- URL: https://exemplo2.com<br><br>"
     ]
   }
   
   REGRAS PARA REFERÊNCIAS:
   - SEMPRE use campo 'itens' como array de strings
   - Cada item do array = uma referência completa
   - SEMPRE adicione <br><br> no final de cada item
   - Formato: "[N]<br>Título<br>- URL: link<br><br>"
   - Se vier em 'texto', detecte padrão [1], [2] e separe em array
   - Garanta espaçamento visual entre referências

3. POST-ITS E CAIXAS DE DESTAQUE:
   - Remova HTML inválido ou tags não fechadas
   - Garanta que <strong>, <em>, <br> estejam corretamente fechados
   - Limpe caracteres especiais que podem quebrar renderização
   - Mantenha formatação didática mas garanta HTML válido

4. GRÁFICOS:
   - Valide estrutura de 'dados' array
   - Garanta valores numéricos válidos
   - Corrija nomes de propriedades se necessário

5. PARÁGRAFOS:
   - Valide HTML
   - Garanta tags fechadas
   - Mantenha <br> para quebras de linha

ESTRATÉGIA DE CORREÇÃO:
- Para Mermaid: SEMPRE corrija ou simplifique, NUNCA deixe com erro
- Para Referências: SEMPRE converta para 'itens' array com <br><br>
- Para HTML: SEMPRE garanta tags válidas e fechadas
- Se não puder corrigir perfeitamente, SIMPLIFIQUE mantendo essência

FORMATO DE RETORNO (apenas JSON, sem comentários):
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
          { role: 'user', content: validationPrompt }
        ],
        temperature: 0.1, // Lower temperature for more consistent corrections
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
