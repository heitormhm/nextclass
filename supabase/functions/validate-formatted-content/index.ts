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

    console.log('[Validation Agent] ═══════════════════════════════════════════════');
    console.log('[Validation Agent] Iniciando correção automática agressiva...');
    console.log(`[Validation Agent] Blocos a corrigir: ${structuredContent?.conteudo?.length || 0}`);
    
    // Log problematic blocks before validation
    structuredContent?.conteudo?.forEach((bloco: any, idx: number) => {
      if (['fluxograma', 'mapa_mental', 'diagrama'].includes(bloco.tipo)) {
        const hasUnicodeArrows = bloco.definicao_mermaid?.match(/[→←↔⇒⇐⇔]/);
        const hasParenInLabel = bloco.definicao_mermaid?.match(/\[([^\]]*?)\([^)]*?\)([^\]]*?)\]/);
        if (hasUnicodeArrows || hasParenInLabel) {
          console.log(`[Validation Agent] ⚠️ Bloco ${idx} (${bloco.tipo}): Contém erros Mermaid`);
        }
      }
      if (bloco.tipo === 'referencias' && bloco.texto && !bloco.itens) {
        console.log(`[Validation Agent] ⚠️ Bloco ${idx}: Referencias em formato 'texto' (deve ser 'itens')`);
      }
    });

    const validationPrompt = `Você é um agente de CORREÇÃO AUTOMÁTICA AGRESSIVA de conteúdo pedagógico estruturado.

TAREFA CRÍTICA: Corrija AUTOMATICAMENTE e AGRESSIVAMENTE todos os erros no JSON a seguir. NÃO apenas valide, CORRIJA COM FORÇA!

JSON A CORRIGIR:
${JSON.stringify(structuredContent, null, 2)}

CORREÇÕES OBRIGATÓRIAS E EXEMPLOS DETALHADOS:

═══════════════════════════════════════════════════════════════════════════════
1. MERMAID DIAGRAMS - CORREÇÃO AGRESSIVA E SIMPLIFICAÇÃO FORÇADA
═══════════════════════════════════════════════════════════════════════════════

🚨 REGRA ABSOLUTA: TODO Mermaid DEVE ser renderizável ou deve ser SIMPLIFICADO drasticamente.

PROBLEMAS COMUNS E CORREÇÕES OBRIGATÓRIAS:

A) SETAS UNICODE (PROIBIDAS):
   ❌ ERRO: graph TD; A → B; C ← D; E ↔ F
   ✅ CORREÇÃO: graph TD; A --> B; C <-- D; E <--> F
   
   CARACTERES A SUBSTITUIR SEMPRE:
   → = -->
   ← = <--
   ↔ = <-->
   ⇒ = ==>
   ⇐ = <==
   ⇔ = <==>

B) PARÊNTESES EM LABELS (CAUSAM ERRO):
   ❌ ERRO: A[Pressão (P/γ) + altura]
   ✅ CORREÇÃO: A[Pressão dividida por peso específico mais altura]
   
   ❌ ERRO: B[Bernoulli (energia conservada)]
   ✅ CORREÇÃO: B[Bernoulli - energia conservada]

C) FÓRMULAS COMPLEXAS EM LABELS:
   ❌ ERRO: graph TD; A[H = (P/γ) + (V²/2g) + z]
   ✅ CORREÇÃO: graph TD; A[Carga hidráulica total]
   
   ❌ ERRO: mindmap; root((ΔP = ρ × g × Δh))
   ✅ CORREÇÃO: mindmap; root((Variação de Pressão))

D) SINTAXE COMPLEXA QUE FALHA:
   ❌ ERRO REAL (exemplo do sistema):
   mindmap
     root((Mecânica dos Fluidos))
       Hidrostática
         Princípio de Pascal (transmissão de pressão)
         Princípio de Arquimedes (empuxo = ρ × V × g)
   
   ✅ CORREÇÃO APLICADA:
   mindmap
     root((Mecânica dos Fluidos))
       Hidrostática
         Princípio de Pascal - transmissão de pressão
         Princípio de Arquimedes - conceito de empuxo

E) SE MERMAID É MUITO COMPLEXO PARA CORRIGIR:
   - SIMPLIFIQUE DRASTICAMENTE mantendo só a estrutura básica
   - Remova TODOS os detalhes técnicos
   - Use apenas texto descritivo simples
   
   Exemplo de simplificação drástica:
   ❌ ORIGINAL QUEBRADO:
   graph TD
     A[Reservatório (z₁, P₁)] --> B[Tubulação (perda ΔH)]
     B --> C[Saída (z₂, P₂, V₂²/2g)]
   
   ✅ SIMPLIFICADO E FUNCIONAL:
   graph TD
     A[Ponto Inicial] --> B[Tubulação]
     B --> C[Ponto Final]

═══════════════════════════════════════════════════════════════════════════════
2. REFERÊNCIAS BIBLIOGRÁFICAS - FORMATAÇÃO RIGOROSA
═══════════════════════════════════════════════════════════════════════════════

🚨 REGRA ABSOLUTA: Referências SEMPRE em array 'itens', NUNCA em campo 'texto'.

❌ ERRO ENCONTRADO NO SISTEMA:
{
  "tipo": "referencias",
  "titulo": "Referências Bibliográficas",
  "texto": "[1] Fonte 1 - URL [2] Fonte 2 - URL"
}

✅ CORREÇÃO OBRIGATÓRIA:
{
  "tipo": "referencias",
  "titulo": "Referências Bibliográficas",
  "itens": [
    "[1]<br>Fonte completa número um com título detalhado<br>- URL: https://exemplo1.com<br><br>",
    "[2]<br>Fonte completa número dois com título detalhado<br>- URL: https://exemplo2.com<br><br>"
  ]
}

FORMATO EXATO OBRIGATÓRIO PARA CADA ITEM:
[NÚMERO]<br>
Título completo da fonte<br>
- URL: link_completo<br><br>

VALIDAÇÃO:
- Se campo 'texto' existe → Converter para 'itens' array
- Se 'itens' não termina com '<br><br>' → Adicionar
- Se falta quebra entre número e título → Adicionar '<br>'
- Se falta '- URL:' antes do link → Adicionar

═══════════════════════════════════════════════════════════════════════════════
3. POST-ITS E CAIXAS DE DESTAQUE - SANITIZAÇÃO HTML
═══════════════════════════════════════════════════════════════════════════════

TAGS PERMITIDAS: <strong>, <em>, <br>, <u>, <p>, <span>
TAGS PROIBIDAS: <div>, <script>, <style>, <a>, <img>, etc.

❌ ERRO: <div><strong>Atenção:</strong> ponto importante<script>alert(1)</script></div>
✅ CORREÇÃO: <strong>Atenção:</strong> ponto importante

❌ ERRO: <strong>Texto não fechado
✅ CORREÇÃO: <strong>Texto fechado corretamente</strong>

═══════════════════════════════════════════════════════════════════════════════
INSTRUÇÕES FINAIS DE PROCESSAMENTO
═══════════════════════════════════════════════════════════════════════════════

PRIORIDADES DE CORREÇÃO:
1. Mermaid: Substituir → por --> (e similares)
2. Mermaid: Remover ou substituir parênteses em labels
3. Mermaid: Simplificar fórmulas para texto descritivo
4. Mermaid: Se ainda quebrar, SIMPLIFICAR DRASTICAMENTE
5. Referencias: Converter 'texto' para 'itens' array
6. Referencias: Garantir <br><br> no final de cada item
7. HTML: Remover tags não permitidas
8. HTML: Fechar tags abertas

SE ALGO NÃO PUDER SER CORRIGIDO:
- Mermaid → Simplificar ao máximo ou criar versão genérica
- Referencias → Converter para formato padrão sempre
- HTML → Remover código problemático, manter só texto

VALIDAÇÃO FINAL ANTES DE RETORNAR:
✓ Nenhum Mermaid contém →, ←, ↔, ⇒, ⇐, ⇔
✓ Nenhum Mermaid contém parênteses em labels
✓ Todas referencias em formato 'itens' array
✓ Todos itens de referencias terminam com <br><br>
✓ Todo HTML usa apenas tags permitidas
✓ Todas tags HTML estão fechadas

FORMATO DE RETORNO (JSON puro, sem markdown):
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

    console.log('[Validation Agent] ✅ Correção automática concluída com sucesso');
    console.log(`[Validation Agent] Blocos corrigidos: ${validatedData.conteudo?.length || 0}`);
    
    // Log what was fixed
    let mermaidFixed = 0;
    let referencesFixed = 0;
    validatedData.conteudo?.forEach((bloco: any) => {
      if (['fluxograma', 'mapa_mental', 'diagrama'].includes(bloco.tipo)) {
        if (bloco.definicao_mermaid && !bloco.definicao_mermaid.match(/[→←↔⇒⇐⇔]/)) {
          mermaidFixed++;
        }
      }
      if (bloco.tipo === 'referencias' && bloco.itens && Array.isArray(bloco.itens)) {
        referencesFixed++;
      }
    });
    
    if (mermaidFixed > 0) console.log(`[Validation Agent] 🔧 Diagramas Mermaid corrigidos: ${mermaidFixed}`);
    if (referencesFixed > 0) console.log(`[Validation Agent] 🔧 Referencias formatadas: ${referencesFixed}`);
    console.log('[Validation Agent] ═══════════════════════════════════════════════');

    // Validar equilíbrio texto-visual
    const contagem = {
      paragrafos: 0,
      elementosVisuais: 0,
      objetivosAprendizagem: false,
      leiturasObrigatorias: false
    };

    validatedData.conteudo?.forEach((bloco: any) => {
      if (bloco.tipo === 'paragrafo') contagem.paragrafos++;
      if (['post_it', 'mapa_mental', 'fluxograma', 'grafico', 'checklist', 'cronograma_gantt'].includes(bloco.tipo)) {
        contagem.elementosVisuais++;
      }
      if (bloco.tipo === 'caixa_de_destaque' && bloco.titulo?.includes('Objetivos')) {
        contagem.objetivosAprendizagem = true;
      }
      if (bloco.tipo === 'caixa_de_destaque' && bloco.titulo?.includes('Leituras')) {
        contagem.leiturasObrigatorias = true;
      }
    });

    // Adicionar avisos se estrutura estiver incompleta
    const avisos: string[] = [];
    if (contagem.paragrafos < 8) {
      console.warn(`[Validation] ⚠️ Poucos parágrafos: ${contagem.paragrafos} (mínimo: 8)`);
      avisos.push(`Conteúdo textual insuficiente (${contagem.paragrafos} parágrafos, mínimo: 8)`);
    }

    if (!contagem.objetivosAprendizagem) {
      console.warn('[Validation] ⚠️ Falta caixa de "Objetivos de Aprendizagem"');
      avisos.push('Ausente: Caixa de Objetivos de Aprendizagem');
    }

    if (!contagem.leiturasObrigatorias) {
      console.warn('[Validation] ⚠️ Falta caixa de "Leituras Obrigatórias"');
      avisos.push('Ausente: Caixa de Leituras Obrigatórias');
    }

    const proporcao = contagem.paragrafos / Math.max(contagem.elementosVisuais, 1);
    if (proporcao < 0.5) {
      console.warn(`[Validation] ⚠️ Desequilíbrio texto-visual: ${proporcao.toFixed(2)} (ideal: 0.5-0.8)`);
      avisos.push(`Desequilíbrio: muitos elementos visuais, poucos parágrafos (proporção: ${proporcao.toFixed(2)})`);
    }

    console.log(`[Validation] 📊 Estrutura: ${contagem.paragrafos} parágrafos, ${contagem.elementosVisuais} visuais (proporção: ${proporcao.toFixed(2)})`);
    if (avisos.length > 0) {
      console.log(`[Validation] ⚠️ Avisos estruturais: ${avisos.join('; ')}`);
    }

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
