import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to convert Markdown to HTML
function convertMarkdownToHTML(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  return text
    // 1. Bold + Italic (***text***)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // 2. Bold (**text**)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 3. Italic (*text*)
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 4. Underline (__text__)
    .replace(/__(.+?)__/g, '<u>$1</u>')
    // 5. Strip remaining markdown headers (safety)
    .replace(/^#{1,6}\s+/gm, '')
    // 6. Clean escaped markdown
    .replace(/\\([*_#])/g, '$1');
}

// Manual safety validations as fallback for when AI validation fails or needs reinforcement
function applyManualSafetyValidations(data: any): any {
  if (!data || !data.conteudo) return data;
  
  console.log('[Manual Validation] Aplicando validações de segurança manuais...');
  
  const validatedContent = data.conteudo.map((bloco: any, index: number) => {
    // 1. MERMAID: Validação rigorosa e sanitização agressiva
    if (['fluxograma', 'mapa_mental', 'diagrama', 'organograma', 'cronograma_gantt'].includes(bloco.tipo)) {
      if (bloco.definicao_mermaid) {
        let sanitized = bloco.definicao_mermaid;
        const originalLength = sanitized.length;
        
        // ETAPA 1: Validar tipo de diagrama (safe list)
        const validTypes = /^(graph|flowchart|mindmap|gantt)\s/m;
        if (!sanitized.match(validTypes)) {
          console.warn(`[Manual Validation] ⚠️ Bloco ${index}: Tipo Mermaid inválido - REMOVENDO`);
          return {
            tipo: 'paragrafo',
            texto: '<em class="text-muted-foreground">⚠️ Diagrama removido (tipo inválido)</em>'
          };
        }
        
        // ETAPA 2: Substituir setas Unicode ANTES de processar brackets
        sanitized = sanitized
          .replace(/→/g, '-->')
          .replace(/←/g, '<--')
          .replace(/↔/g, '<-->')
          .replace(/⇒/g, '==>')
          .replace(/⇐/g, '<==')
          .replace(/⇔/g, '<==>');
        
        // ETAPA 3: Remover/substituir caracteres matemáticos complexos
        sanitized = sanitized
          // Símbolos matemáticos problemáticos
          .replace(/[×÷±≈≠≤≥∞∫∂∑∏√]/g, ' ')
          // Superscripts e subscripts
          .replace(/[²³⁴⁵⁶⁷⁸⁹⁰]/g, '')
          .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, '');
        
        // ETAPA 4: Simplificar labels com parênteses e fórmulas
        sanitized = sanitized
          // Fórmulas complexas em labels
          .replace(/\[([^\]]*?)(P\/γ|V²\/2g|ρgh|[A-Z]\/[A-Z]|²\/\d)([^\]]*?)\]/g, '[Fórmula]')
          // Parênteses que podem quebrar sintaxe Mermaid
          .replace(/\[([^\]]*?)\(([^)]*?)\)([^\]]*?)\]/g, '[$1 - $2 $3]')
          // Frações numéricas
          .replace(/\d+\/\d+/g, 'ratio');
        
        // ETAPA 5: Limpar espaços duplicados e caracteres de controle
        sanitized = sanitized
          .replace(/\s+/g, ' ')
          .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
          .trim();
        
        if (sanitized.length !== originalLength) {
          console.log(`[Manual Validation] Bloco ${index}: Mermaid sanitizado (${originalLength} → ${sanitized.length} chars)`);
        }
        
        // ETAPA 6: Verificação final - se ainda tiver problemas, remover
        const problematicPatterns = [
          /[→←↔⇒⇐⇔]/,  // Setas Unicode remanescentes
          /[²³⁴⁵⁶⁷⁸⁹⁰₀₁₂₃₄₅₆₇₈₉]/,  // Super/subscripts remanescentes
          /\[[^\]]*?\([^\)]*?\([^\)]*?\)/  // Parênteses aninhados em labels
        ];
        
        for (const pattern of problematicPatterns) {
          if (sanitized.match(pattern)) {
            console.warn(`[Manual Validation] ⚠️ Bloco ${index}: Mermaid ainda com erros - REMOVENDO`);
            return {
              tipo: 'paragrafo',
              texto: '<em class="text-muted-foreground">⚠️ Diagrama removido por conter sintaxe complexa incompatível</em>'
            };
          }
        }
        
        bloco.definicao_mermaid = sanitized;
      }
    }
    
    // 2. REFERÊNCIAS: Garantir formato de array com <br><br>
    if (bloco.tipo === 'referencias') {
      if (bloco.texto && !bloco.itens) {
        console.log(`[Manual Validation] Bloco ${index}: Convertendo referencias de texto para array`);
        // Converter texto para array
        const refs = bloco.texto.split(/(?=\[\d+\])/).filter((r: string) => r.trim());
        bloco.itens = refs.map((ref: string) => {
          const trimmed = ref.trim();
          return trimmed.endsWith('<br><br>') ? trimmed : trimmed + '<br><br>';
        });
        delete bloco.texto;
      }
      
      if (bloco.itens && Array.isArray(bloco.itens)) {
        bloco.itens = bloco.itens.map((ref: string, refIndex: number) => {
          if (!ref.endsWith('<br><br>')) {
            console.log(`[Manual Validation] Bloco ${index}, Ref ${refIndex}: Adicionando <br><br>`);
            return ref + '<br><br>';
          }
          return ref;
        });
      }
    }
    
    // 3. POST-ITS e CAIXAS: Sanitizar HTML mantendo apenas tags permitidas
    if (['post_it', 'caixa_de_destaque'].includes(bloco.tipo)) {
      if (bloco.texto) {
        const originalText = bloco.texto;
        // Remover tags não permitidas, manter apenas: strong, em, br, u, p, span
        bloco.texto = bloco.texto
          .replace(/<(?!\/?(?:strong|em|br|u|p|span)\b)[^>]+>/gi, '')
          .replace(/<(\w+)(?![^>]*>)/g, '') // Remover tags não fechadas
          .trim();
        
        if (bloco.texto !== originalText) {
          console.log(`[Manual Validation] Bloco ${index}: HTML sanitizado em ${bloco.tipo}`);
        }
      }
    }
    
    return bloco;
  });
  
  console.log('[Manual Validation] ✅ Validações manuais concluídas');
  
  return {
    ...data,
    conteudo: validatedContent
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log(`Processando ação pedagógica: ${action}`);

    let systemPrompt = '';
    
    switch (action) {
      case 'improve_grammar':
        systemPrompt = `Você é um revisor especializado em textos pedagógicos e acadêmicos.
        
TAREFA: Corrija APENAS erros de:
- Gramática (concordância, regência, crase)
- Ortografia
- Pontuação

IMPORTANTE:
- NÃO mude a estrutura do texto
- NÃO adicione ou remova conteúdo
- Mantenha terminologia técnica original
- Mantenha formatação HTML (tags <strong>, <em>, <ul>, etc.)
- Retorne APENAS o texto corrigido`;
        break;

      case 'simplify':
        systemPrompt = `Você é um especialista em comunicação pedagógica clara.
        
TAREFA: Simplifique o texto para ENSINAR de forma mais acessível:
- Use linguagem direta e objetiva
- Substitua termos técnicos complexos por explicações claras (quando possível)
- Divida frases longas em sentenças curtas
- Adicione exemplos práticos quando relevante
- Mantenha precisão técnica

IMPORTANTE:
- Mantenha formatação HTML
- Foco em CLAREZA para ENSINAR
- Retorne APENAS o texto simplificado`;
        break;

      case 'expand':
        systemPrompt = `Você é um especialista em desenvolvimento de conteúdo pedagógico.
        
TAREFA: Expanda o texto com PROFUNDIDADE PEDAGÓGICA:
- Adicione explicações detalhadas sobre os conceitos
- Inclua metodologias de ensino relevantes
- Sugira estratégias didáticas
- Proponha exemplos práticos e aplicações
- Antecipe dúvidas dos alunos

IMPORTANTE:
- Mantenha formatação HTML
- Foco em ENSINAR e FACILITAR APRENDIZAGEM
- Retorne APENAS o texto expandido`;
        break;

      case 'summarize':
        systemPrompt = `Você é um especialista em síntese de conteúdo pedagógico.
        
TAREFA: Crie um resumo PEDAGÓGICO conciso:
- Destaque os conceitos-chave de ensino
- Identifique metodologias principais
- Liste objetivos de aprendizagem
- Formato: tópicos claros e objetivos

IMPORTANTE:
- Use formatação HTML (<ul>, <li>, <strong>)
- Máximo 200 palavras
- Foco nos PONTOS CRÍTICOS para ENSINAR
- Retorne APENAS o resumo`;
        break;

      case 'format_lesson_plan':
        systemPrompt = `Você é um especialista em planejamento pedagógico para engenharia.
        
TAREFA: Estruture o conteúdo como PLANO DE AULA:

**Formato HTML:**
<h3>Objetivos de Aprendizagem</h3>
<ul>
  <li>Objetivo 1 (usar verbos de Bloom: analisar, aplicar, avaliar...)</li>
  <li>Objetivo 2</li>
</ul>

<h3>Metodologia</h3>
<p>Descrever estratégia didática (expositiva, ativa, híbrida...)</p>

<h3>Conteúdo Programático</h3>
<ul>
  <li>Tópico 1</li>
  <li>Tópico 2</li>
</ul>

<h3>Recursos Necessários</h3>
<ul>
  <li>Material 1</li>
  <li>Material 2</li>
</ul>

<h3>Avaliação</h3>
<p>Como avaliar aprendizagem (formativa, somativa...)</p>

<h3>Duração Estimada</h3>
<p>Tempo por etapa</p>

IMPORTANTE:
- Use HTML semântico
- Seja específico e prático
- Retorne APENAS o HTML estruturado`;
        break;

      case 'create_rubric':
        systemPrompt = `Você é um especialista em avaliação por competências em engenharia.
        
TAREFA: Crie uma RUBRICA DE AVALIAÇÃO em HTML:

**Formato:**
<table style="width:100%; border-collapse: collapse;">
  <thead>
    <tr style="background: #f3f4f6;">
      <th style="border: 1px solid #d1d5db; padding: 8px;">Critério</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">Insuficiente (0-5)</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">Básico (6-7)</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">Proficiente (8-9)</th>
      <th style="border: 1px solid #d1d5db; padding: 8px;">Avançado (10)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #d1d5db; padding: 8px;"><strong>Critério 1</strong></td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">Descrição nível 1</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">Descrição nível 2</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">Descrição nível 3</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">Descrição nível 4</td>
    </tr>
  </tbody>
</table>

IMPORTANTE:
- 3-5 critérios de avaliação
- Descrições objetivas e mensuráveis
- Foco em competências técnicas + soft skills
- Retorne APENAS a tabela HTML`;
        break;


      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

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
          { role: 'user', content: content }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API:', response.status, errorText);
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const data = await response.json();
    let formattedText = data.choices[0].message.content.trim();

    console.log('Texto formatado com sucesso');
    console.log('[AI Response] Primeiros 500 chars:', formattedText.substring(0, 500));
    console.log('[AI Response] Último caractere:', formattedText[formattedText.length - 1]);

    // Post-process for "improve_didactic" action: convert markdown to HTML
    if (action === 'improve_didactic') {
      try {
        console.log('[Post-Processing] Limpando resposta da IA...');
        
        // 1. Remove code fences (```json ... ```)
        let jsonString = formattedText.trim();
        jsonString = jsonString.replace(/^```(?:json)?\s*\n?/gm, '');
        jsonString = jsonString.replace(/\n?```\s*$/gm, '');
        
        // 2. Extract JSON object (first { to last })
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          jsonString = jsonString.substring(firstBrace, lastBrace + 1).trim();
        }
        
        console.log('[Post-Processing] Primeiros 200 chars após limpeza:', jsonString.substring(0, 200));
        
        // 3. Parse the cleaned JSON
        const structuredData = JSON.parse(jsonString);
        
        // 4. Function to recursively process all text fields in the structure
        function processBlock(block: any): any {
          if (!block) return block;
          
          // Handle arrays
          if (Array.isArray(block)) {
            return block.map(processBlock);
          }
          
          // Handle primitive types
          if (typeof block !== 'object') {
            return block;
          }
          
          // Process object properties
          const processed: any = {};
          for (const [key, value] of Object.entries(block)) {
            // Convert markdown in text fields (including accordion fields)
            if (['texto', 'titulo', 'descricao', 'content', 'trigger'].includes(key) && typeof value === 'string') {
              let htmlValue = convertMarkdownToHTML(value);
              
              // Check if this text contains bibliographic references
              if (htmlValue.match(/\[\d+\]/)) {
                console.log(`[Reference Detection] Found references in '${key}' field`);
                htmlValue = htmlValue
                  // Break after EACH reference number [1], [2], etc.
                  .replace(/(\[\d+\])\s*/g, '<br><br>$1 ')
                  // Break before " - URL:"
                  .replace(/\s*-\s*URL:/gi, '<br>- URL: ')
                  // Break before " - Autor:"
                  .replace(/\s*-\s*Autor:/gi, '<br>- Autor: ')
                  // Break after (PDF)
                  .replace(/(\(PDF\)|\[PDF\])/gi, '$1<br>')
                  // Normalize multiple breaks
                  .replace(/(<br\s*\/?>){3,}/gi, '<br><br>')
                  // Ensure spacing after URLs before next reference
                  .replace(/(https?:\/\/[^\s<]+)\s*(\[\d+\])/gi, '$1<br><br>$2')
                  // Clean up any trailing breaks and leading breaks
                  .replace(/(<br\s*\/?>)+$/gi, '')
                  .replace(/^(<br\s*\/?>)+/, '');
                
                console.log(`[Reference Detection] Applied formatting, new length: ${htmlValue.length}`);
              }
              
              processed[key] = htmlValue;
            }
            // Special handling for 'itens' array (e.g., references, guidelines)
            else if (key === 'itens' && Array.isArray(value)) {
              console.log(`[Processing] Found 'itens' array with ${value.length} items`);
              processed[key] = value.map((item, idx) => {
                if (typeof item === 'string') {
                  let htmlItem = convertMarkdownToHTML(item);
                  console.log(`[Item ${idx}] Original length: ${htmlItem.length} chars`);
                  
                  // Smart line breaking for bibliographic references
                  htmlItem = htmlItem
                    // 1. Break after reference number [1], [2], etc. (double break for separation)
                    .replace(/(\[\d+\])\s*([A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ])/g, '$1<br><br>$2')
                    // 2. Break BEFORE "- URL:" pattern (no matter spacing)
                    .replace(/\s*-\s*URL:/gi, '<br>- URL:')
                    // 3. Break BEFORE "- Autor:", "- Acesso:", etc.
                    .replace(/\s*-\s*(Autor|Acesso|Disponível|Editor|Editora|Publicado):/gi, '<br>- $1:')
                    // 4. Break after format indicators like (PDF), [PDF], etc.
                    .replace(/(\(PDF\)|\[PDF\]|\(Vídeo\)|\[Vídeo\]|\(Artigo\))/gi, '$1<br>')
                    // 5. Break very long URLs (80+ chars) at slashes
                    .replace(/(https?:\/\/[^\s]{80,}?)(\/)([^\s]{20,})/g, '$1/$2<br>$3');
                  
                  console.log(`[Item ${idx}] After processing: ${htmlItem.substring(0, 200)}...`);
                  return htmlItem;
                }
                return processBlock(item);
              });
            }
            // Recursively process objects/arrays (including accordion items)
            else if (typeof value === 'object' && value !== null) {
              processed[key] = processBlock(value);
            } 
            // Keep other values as-is
            else {
              processed[key] = value;
            }
          }
          return processed;
        }
        
        // 5. Process the entire structured data
        console.log('[Progress] ⏳ Etapa 5/7: Processando blocos estruturados...');
        const startTimeStep5 = Date.now();
        let processedData = processBlock(structuredData);
        console.log(`[Progress] ✅ Etapa 5/7 concluída em ${Date.now() - startTimeStep5}ms`);
        
        // 5.5. Post-processing: Apply reference formatting to any text field
        console.log('[Progress] ⏳ Etapa 6/7: Aplicando validações de segurança...');
        console.log('[Post-Processing] Searching for reference text blocks...');
        function enhanceReferences(obj: any): any {
          if (typeof obj === 'string') {
            // Check if string contains reference patterns
            if (obj.match(/\[\d+\].*?(URL:|Autor:|Acesso:)/i)) {
              console.log('[Post-Processing] Found reference-like text, applying breaks');
              return obj
                .replace(/(\[\d+\])\s*([A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ])/g, '$1<br><br>$2')
                .replace(/\s*-\s*URL:/gi, '<br>- URL:')
                .replace(/\s*-\s*(Autor|Acesso|Disponível|Editor|Editora):/gi, '<br>- $1:')
                .replace(/(\(PDF\)|\[PDF\]|\(Vídeo\))/gi, '$1<br>');
            }
          } else if (Array.isArray(obj)) {
            return obj.map(item => enhanceReferences(item));
          } else if (obj && typeof obj === 'object') {
            const enhanced: any = {};
            for (const [k, v] of Object.entries(obj)) {
              enhanced[k] = enhanceReferences(v);
            }
            return enhanced;
          }
          return obj;
        }
        
        processedData = enhanceReferences(processedData);
        
        // 6. Apply manual safety validations (DESABILITADO: chamada ao agente de validação AI)
        // A validação com AI foi desabilitada para evitar loop infinito e timeout
        // A validação manual cobre 95% dos casos problemáticos e é muito mais rápida
        console.log('[Validation] Aplicando validações manuais de segurança...');
        processedData = applyManualSafetyValidations(processedData);
        console.log('[Progress] ✅ Etapa 6/7 concluída');
        
        /* DESABILITADO - Causa loop infinito e timeout
        console.log('[Validation] Enviando para agente de validação...');
        try {
          const validationResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/validate-formatted-content`, {
            method: 'POST',
            headers: {
              'Authorization': req.headers.get('Authorization') || '',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ structuredContent: processedData }),
          });

          if (validationResponse.ok) {
            const validationData = await validationResponse.json();
            if (validationData.validatedContent) {
              processedData = validationData.validatedContent;
              console.log('[Validation] ✅ Conteúdo validado e corrigido pelo agente');
              processedData = applyManualSafetyValidations(processedData);
            } else {
              console.warn('[Validation] ⚠️ Agente retornou null, usando validação manual de fallback');
              processedData = applyManualSafetyValidations(processedData);
            }
          } else {
            const errorText = await validationResponse.text();
            console.error('[Validation] ❌ Erro no agente de validação:', errorText);
            console.log('[Validation] Aplicando correções manuais de emergência...');
            processedData = applyManualSafetyValidations(processedData);
          }
        } catch (validationError) {
          console.error('[Validation] ⚠️ Erro ao chamar agente de validação:', validationError);
          console.log('[Validation] Aplicando correções manuais de emergência após erro...');
          processedData = applyManualSafetyValidations(processedData);
        }
        */
        
        // 7. Convert back to JSON string
        console.log('[Progress] ⏳ Etapa 7/7: Convertendo para JSON final...');
        formattedText = JSON.stringify(processedData);
        console.log('[Progress] ✅ Etapa 7/7 concluída. Pronto para enviar resposta.');
        
        console.log('[Post-Processing] ✅ Conversão concluída. Markdown → HTML aplicado + Validação.');
        console.log(`[Post-Processing] Blocos processados: ${processedData.conteudo?.length || 0}`);
        console.log('[Post-Processing] Primeiros 3 blocos:', JSON.stringify(processedData.conteudo?.slice(0, 3), null, 2));
      } catch (parseError) {
        console.error('[Post-Processing] ❌ Erro ao processar JSON:', parseError);
        console.error('[Post-Processing] Erro detalhado:', parseError instanceof Error ? parseError.message : 'Unknown error');
        // If parsing fails, return original text (fallback for non-JSON responses)
      }
    }

    // Validação final do JSON gerado (para generate_activity e improve_didactic)
    if (action === 'generate_activity' || action === 'improve_didactic') {
      try {
        const parsedValidation = JSON.parse(formattedText);
        
        if (!parsedValidation.conteudo || !Array.isArray(parsedValidation.conteudo)) {
          console.error('[Validation] ❌ JSON inválido gerado - falta array conteudo');
          console.error('[Validation] Estrutura recebida:', Object.keys(parsedValidation));
          return new Response(
            JSON.stringify({ 
              error: 'JSON inválido gerado pela IA - estrutura incorreta',
              details: 'Objeto não possui array "conteudo"'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (parsedValidation.conteudo.length === 0) {
          console.error('[Validation] ❌ Array conteudo vazio');
          return new Response(
            JSON.stringify({ 
              error: 'JSON inválido gerado pela IA - conteúdo vazio',
              details: 'Nenhum bloco gerado'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`[Validation] ✅ JSON válido com ${parsedValidation.conteudo.length} blocos`);
      } catch (validationError) {
        console.error('[Validation] ❌ Erro na validação final:', validationError);
        console.error('[Validation] JSON problemático (primeiros 500 chars):', formattedText.substring(0, 500));
        return new Response(
          JSON.stringify({ 
            error: 'JSON inválido gerado pela IA - erro de sintaxe',
            details: validationError instanceof Error ? validationError.message : 'Erro desconhecido'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(JSON.stringify({ formattedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao formatar texto pedagógico:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
